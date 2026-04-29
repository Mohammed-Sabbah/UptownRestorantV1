"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { sendOrderInvoiceEmail } from "./mail-actions";

/**
 * Checks if the database is configured (non-placeholder URL).
 */
function isDBConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return (
        url.length > 0 &&
        !url.includes("your-project") &&
        !url.includes("your-supabase") &&
        url.startsWith("https://") &&
        url.includes(".supabase.co")
    );
}

/**
 * Verifies the reCAPTCHA token with Google's API.
 */
async function verifyRecaptcha(token: string) {
    // return true; // تجاوز الفحص مؤقتاً
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
        console.warn("[reCAPTCHA] ⚠️ RECAPTCHA_SECRET_KEY not set. Skipping verification.");
        return true;
    }

    try {
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${secret}&response=${token}`
        });

        const data = await response.json();
        return data.success;
    } catch (err) {
        console.error("[reCAPTCHA] ❌ Verification error:", err);
        return false;
    }
}

/**
 * Sends an SMS Notification to the Customer (Required by PalPay)
 * @param phone Customer's 10-digit phone number
 * @param amount Total amount paid
 * @param orderId The order reference
 */
async function sendSMSNotification(phone: string, amount: number, orderId: string | number) {
    console.log(`\n--- 📱 جاري إرسال رسالة SMS حقيقية (Twilio) ---`);

    // تحويل الرقم الفلسطيني للصيغة الدولية التي تقبلها Twilio
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+970' + formattedPhone.substring(1);
    }

    console.log(`المستلم: ${formattedPhone} | الطلب: #${orderId}`);

    const smsMessage = `تم استلام دفعتك بقيمة ${amount} ₪ لطلبك رقم #${orderId} من مطاعم أبتاون. شكراً لك!`;

    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromPhone) {
            console.warn("⚠️ إعدادات Twilio مفقودة في ملف .env");
            return false;
        }

        // بناء البيانات حسب توثيق Twilio (من رقم إلى رقم)
        const payload = new URLSearchParams({
            To: formattedPhone,
            From: fromPhone, // رقم Twilio الخاص بك
            Body: smsMessage
        });

        // تشفير بيانات الدخول للـ API
        const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${basicAuth}`
            },
            body: payload.toString()
        });

        const responseData = await response.json();

        // فحص وجود أخطاء من سيرفر Twilio
        if (!response.ok) {
            throw new Error(responseData.message || "فشل الاتصال بـ Twilio");
        }

        console.log(`✅ تم الإرسال بنجاح! ID الرسالة:`, responseData.sid);
        console.log(`--------------------------------\n`);
        return true;

    } catch (error: any) {
        console.error(`❌ فشل إرسال الرسالة:`, error.message);
        console.log(`--------------------------------\n`);
        return false;
    }
}

/** * Finalizes an order after payment (Cash or Online).
 * Sets status to Paid.
 */
/**
 * يقوم بإنهاء الطلب بعد الدفع (نقدي أو إلكتروني).
 * يضبط الحالة إلى "Paid" ويرسل الإشعارات.
 */
export async function finalizeOrder(orderId: string | number) {
    console.log(`\n--- ⏳ بدء عملية الإنهاء للطلب رقم: #${orderId} ---`);

    try {
        const supabase = getSupabaseAdmin();

        // 1. تحديث حالة الطلب أولاً
        await supabase
            .from("orders")
            .update({
                status: "Confirmed",
                payment_status: "Paid",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);
        // 2. جلب البيانات كاملة (الطلب + الفرع + المنتجات)
        // ملاحظة: تأكد أن الأسماء (branches, order_items) تطابق أسماء الجداول عندك
        const { data: orderData, error: fetchErr } = await supabase
            .from("orders")
            .select(`
                *,
                branches (*),
                order_items (*)
            `)
            .eq("id", orderId)
            .single();

        if (fetchErr || !orderData) {
            console.error("❌ فشل جلب البيانات من الداتابيز:", fetchErr?.message);
            return { success: true };
        }

        // 3. تجهيز المتغيرات
        const branchData = orderData.branches;
        const itemsData = orderData.order_items || [];

        // 4. حل مشكلة الـ undefined والـ Types
        // ندمج بيانات القاعدة مع مسميات الـ Type التي تتوقعها الدالة
        const mappedOrder: any = {
            ...orderData,
            branchId: orderData.branch_id,
            customerName: orderData.customer_name,
            customerPhone: orderData.customer_phone,
            customerEmail: orderData.customer_email,
            totalAmount: orderData.total_amount,
            orderType: orderData.order_type,
            deliveryFee: orderData.delivery_fee,
            invoiceDiscountAmount: orderData.invoice_discount_amount,
            invoiceDiscountType: orderData.invoice_discount_type,
        };

        // 5. إرسال الإيميل
        if (orderData.customer_email && !orderData.customer_email.includes('customer@uptownps.com')) {
            console.log(`📧 [Action] محاولة إرسال فاتورة للإيميل: ${orderData.customer_email}`);
            try {
                // نمرر mappedOrder الذي يحتوي على النوعين (snake & camel) لضمان العمل
                await sendOrderInvoiceEmail(mappedOrder, itemsData, branchData);
                console.log(`✅ [Email Service] تم إرسال الفاتورة بنجاح.`);
            } catch (emailErr: any) {
                console.error(`📧 [Error] فشل في دالة الإرسال:`, emailErr.message);
            }
        }

        console.log(`✨ [Final Success] تم إنهاء الطلب #${orderId} بنجاح.`);
        return { success: true };

    } catch (err: any) {
        console.error(`❌ [Finalize Error] خطأ عام:`, err.message);
        return { success: false, error: err.message };
    }
}

export async function markOrderFailed(
    orderId: string | number,
    reason: string = "failed"
) {
    console.log(`\n--- ❌ تسجيل فشل الدفع للطلب: #${orderId} | السبب: ${reason} ---`);

    try {
        const supabase = getSupabaseAdmin();

        await supabase
            .from("orders")
            .update({
                payment_status: "Failed",
                status: "Cancelled",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        console.log(`✅ تم تسجيل فشل الطلب #${orderId} في DB`);
        return { success: true };

    } catch (err: any) {
        console.error(`❌ [markOrderFailed] خطأ:`, err.message);
        return { success: false, error: err.message };
    }
}

export async function saveOrderAction(orderData: any, items: any[], captchaToken?: string) {
    console.log(`[saveOrderAction] Processing order for: ${orderData.customerName}`);

    // Verify Captcha if token provided (or if secret is set)
    if (process.env.RECAPTCHA_SECRET_KEY && !orderData.isDemo) {
        if (!captchaToken) {
            return { success: false, error: "Please complete the reCAPTCHA verification" };
        }
        const isValid = await verifyRecaptcha(captchaToken);
        if (!isValid) {
            return { success: false, error: "reCAPTCHA verification failed. Please try again." };
        }
    }

    if (!isDBConfigured()) {
        console.warn("[saveOrderAction] ⚠️ DB not configured. Running in demo mode.");
        const demoOrderId = Math.floor(10000 + Math.random() * 90000);
        return { success: true, orderId: demoOrderId, isDemo: true };
    }

    try {
        const supabase = getSupabaseAdmin();

        // 1. Upsert Customer — مع increment للإحصائيات
        const totalAmount = orderData.totalAmount ?? orderData.total_amount ?? 0;

        const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id, total_orders, total_spent, email")
            .eq("phone", orderData.customerPhone)
            .single();

        let customer;
        if (existingCustomer) {
            const { data, error } = await supabase
                .from("customers")
                .update({
                    name: orderData.customerName,
                    email: orderData.customerEmail || existingCustomer.email,
                    total_orders: (existingCustomer.total_orders ?? 0) + 1,
                    total_spent: Number(existingCustomer.total_spent ?? 0) + totalAmount,
                    last_order_at: new Date().toISOString(),
                })
                .eq("id", existingCustomer.id)
                .select("id")
                .single();
            if (error) throw error;
            customer = data;
        } else {
            const { data, error } = await supabase
                .from("customers")
                .insert({
                    phone: orderData.customerPhone,
                    name: orderData.customerName,
                    email: orderData.customerEmail || null,
                    total_orders: 1,
                    total_spent: totalAmount,
                    last_order_at: new Date().toISOString(),
                })
                .select("id")
                .single();
            if (error) throw error;
            customer = data;
        }

        // 2. Insert Order
        // ← هون بكمل الكود الموجود بدون تغيير، بس احذف السطر اللي بعرّف totalAmount لأنك عرّفته فوق

        // 2. Insert Order
        console.log(`[saveOrderAction] 📦 Inserting order for customer ${customer.id}, amount ${totalAmount}...`);

        const { data: orderResponse, error: orderError } = await supabase
            .from('orders')
            .insert({
                branch_id: orderData.branchId,
                customer_id: customer.id,
                customer_name: orderData.customerName,
                customer_phone: orderData.customerPhone,
                customer_email: orderData.customerEmail,
                order_type: orderData.orderType,
                address: orderData.address || null,
                table_number: orderData.tableNumber || null,
                total_amount: totalAmount,
                delivery_fee: orderData.deliveryFee ?? 0,
                delivery_discount_amount: orderData.deliveryDiscountAmount ?? 0,   // ← أضف هاد
                delivery_discount_type: orderData.deliveryDiscountType ?? null,    // ← وهاد
                invoice_discount_amount: orderData.invoiceDiscountAmount ?? 0,
                invoice_discount_type: orderData.invoiceDiscountType ?? null,
                status: "Pending",
                payment_method: orderData.paymentMethod,
                payment_status: "Pending",
                scheduled_at: orderData.scheduledAt || null,
                notes: orderData.notes || null   // ✅ أضف هاد
            })
            .select("id")
            .single();

        if (orderError) {
            console.error("[saveOrderAction] ❌ Supabase Order Insert Error:", orderError);
            throw new Error(`Order insertion failed: ${orderError.message}`);
        }

        if (!orderResponse || !orderResponse.id) {
            console.error("[saveOrderAction] ❌ No ID returned from order insert. Response:", orderResponse);
            throw new Error("Failed to retrieve order ID from database.");
        }

        const orderId = orderResponse.id;
        console.log(`[saveOrderAction] ✨ Order created with ID: ${orderId}`);

        // 3. Insert Order Items
        const orderItems = items.map(item => ({
            order_id: orderId,
            product_id: item.id ? Number(item.id) : null,
            product_name_ar: item.nameAr || "",
            product_name_en: item.nameEn || "",
            quantity: item.quantity,
            price: item.finalPrice ?? item.price ?? 0,
            original_price: item.originalPrice ?? item.finalPrice ?? item.price ?? 0,
            addon_details: item.addonDetails || null
        }));

        if (orderItems.length > 0) {
            console.log(`[saveOrderAction] 🛒 Inserting ${orderItems.length} items...`);
            const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
            if (itemsError) {
                console.error("[saveOrderAction] ❌ Order Items Insert Error:", itemsError);
                throw itemsError;
            }
        }

        // 4. Finalize immediately for Cash/WhatsApp orders
        if (orderData.paymentMethod === 'Cash') {
            await finalizeOrder(orderId);
        }

        console.log(`[saveOrderAction] ✅ Order ${orderId} finalized and saved successfully.`);
        return { success: true, orderId: orderId };

    } catch (err: any) {
        console.error(`[saveOrderAction] ❌ Error:`, err.message);
        return { success: false, error: err.message || "Unknown error during save" };
    }
}

export async function getOrderSummary(orderId: string | number) {
    if (!isDBConfigured()) {
        console.warn(`[getOrderSummary] ⚠️ DB not configured. Returning demo receipt for #${orderId}`);
        return {
            success: true,
            order: {
                id: orderId,
                customer_name: null,
                order_type: null,
                total_amount: null,
                branches: null,
                order_items: []
            },
            isDemo: true
        };
    }

    try {
        const supabase = getSupabaseAdmin();
        const { data: order, error } = await supabase
            .from("orders")
            .select("*, order_items(*), branches(*)")
            .eq("id", orderId)
            .single();

        if (error) throw error;
        return { success: true, order };

    } catch (err: any) {
        console.error(`[getOrderSummary] ❌ Error:`, err.message);
        return {
            success: false,
            error: err.message,
            order: null
        };
    }
}

export async function updateOrderStatus(orderId: number | string, newStatus: string, estimatedTime?: string) {
    if (!isDBConfigured()) return { success: false, error: "DB not configured" };
    try {
        const supabase = getSupabaseAdmin();
        const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
        if (estimatedTime) updateData.estimated_time = estimatedTime;

        const { error } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", orderId);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("[updateOrderStatus] Error:", err.message);
        return { success: false, error: err.message };
    }
}