"use client";

import { useState, useEffect, useTransition } from "react";
import { Branch, SiteSettings } from "@/lib/types";
import { saveOrderAction } from "@/lib/order-actions";
import Script from "next/script";
import { ShoppingBag, Truck, Utensils, Clock, CreditCard, Banknote, CheckCircle2, Info, Sparkles } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { loadCustomer, saveCustomer } from "@/lib/customer-storage";

type Props = {
    branch: Branch;
    settings: SiteSettings;
    lang: string;
};

export default function CheckoutForm({ branch, settings, lang: initialLang }: Props) {
    const [lang, setLang] = useState(initialLang);
    const [orderType, setOrderType] = useState<"inRestaurant" | "delivery">("inRestaurant");
    const [subType, setSubType] = useState<"table" | "pickup">("table");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "palpay">("cash");
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [selectedZone, setSelectedZone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [subtotal, setSubtotal] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [total, setTotal] = useState(0);
    const [isOpen, setIsOpen] = useState(true);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [discountRules, setDiscountRules] = useState<any[]>([]);
    const [smartDeliveryDiscount, setSmartDeliveryDiscount] = useState(0);
    const [effectiveDeliveryFee, setEffectiveDeliveryFee] = useState<number | null>(null);
    const [invoiceItemRules, setInvoiceItemRules] = useState<any[]>([]);
    const [invoiceDiscount, setInvoiceDiscount] = useState(0);
    const [invoiceDiscountType, setInvoiceDiscountType] = useState<"fixed" | "percentage">("fixed");

    const isAr = lang === "ar";



    // ✅ Autofill من localStorage — الحقول العامة عند mount
    useEffect(() => {
        const saved = loadCustomer();
        if (!saved) return;

        const set = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el && val) el.value = val;
        };

        set("customer-name", saved.name);
        set("customer-phone", saved.phone);
        set("customer-email", saved.email);

        // Zone — لو محفوظة نفوت عليها
        if (saved.lastZone) {
            const zone = branch.deliveryZones?.find(z =>
                z.nameAr === saved.lastZone || z.nameEn === saved.lastZone
            );
            if (zone) {
                setSelectedZone(saved.lastZone);
                setDeliveryFee(zone.fee);
            }
        }
    }, []); // مرة واحدة عند mount

    // ✅ Autofill حقول الديليفري — بس لما تظهر في الـ DOM
    useEffect(() => {
        if (orderType !== "delivery") return;
        const saved = loadCustomer();
        if (!saved) return;

        const set = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el && val) el.value = val;
        };

        // setTimeout عشان نضمن إن الـ DOM اتبنى
        setTimeout(() => {
            set("customer-street", saved.street);
            set("customer-building", saved.building);
            set("customer-address-notes", saved.addressNotes);
        }, 0);
    }, [orderType]);



    useEffect(() => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (branch.openingTime && branch.closingTime) {
            const [openH, openM] = branch.openingTime.split(':').map(Number);
            const [closeH, closeM] = branch.closingTime.split(':').map(Number);
            const openTotal = openH * 60 + openM;
            let closeTotal = closeH * 60 + closeM;
            if (closeTotal < openTotal) {
                setIsOpen(currentMinutes >= openTotal || currentMinutes <= closeTotal);
            } else {
                setIsOpen(currentMinutes >= openTotal && currentMinutes <= closeTotal);
            }
        }
    }, [branch.openingTime, branch.closingTime]);

    useEffect(() => {
        async function fetchRules() {
            try {
                const [deliveryRes, invoiceRes] = await Promise.all([
                    fetch("/api/admin/invoice-discounts"),
                    fetch("/api/admin/invoice-item-discounts"),
                ]);
                const deliveryData = await deliveryRes.json();
                const invoiceData = await invoiceRes.json();
                if (deliveryData.rules) setDiscountRules(deliveryData.rules);
                if (invoiceData.rules) setInvoiceItemRules(invoiceData.rules);
            } catch (error) {
                console.error("Error fetching discount rules:", error);
            }
        }
        fetchRules();
    }, []);

    // ✅ كشف رجوع المستخدم من Lahza بدون دفع
    useEffect(() => {
        const pendingOrderId = sessionStorage.getItem("pending_order_id");
        const pendingOrderSlug = sessionStorage.getItem("pending_order_slug");

        if (pendingOrderId && pendingOrderSlug === branch.slug) {
            fetch("/api/payments/lahza/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: pendingOrderId })
            }).catch(() => { });

            sessionStorage.removeItem("pending_order_id");
            sessionStorage.removeItem("pending_order_slug");
        }
    }, [branch.slug]);

    useEffect(() => {
        const syncData = () => {
            if (typeof window === "undefined" || !(window as any).Cart) return;

            const cart = (window as any).Cart;
            const slug = branch.slug;

            const items = cart.getItems(slug);
            setCartItems(items);

            const itemsTotal = cart.getTotal(slug);
            const subtotal = itemsTotal;

            let smartDiscountAmount = 0;
            let baseFee = 0;

            if (orderType === "delivery") {
                baseFee = deliveryFee ?? settings.deliveryFee ?? 0;

                const rule = discountRules.find((r: any) =>
                    itemsTotal >= r.min &&
                    (r.max === null || itemsTotal <= r.max)
                );

                if (rule) {
                    switch (rule.type) {
                        case "free":
                            smartDiscountAmount = baseFee;
                            break;
                        case "fixed":
                            smartDiscountAmount = rule.value;
                            break;
                        case "percentage":
                            smartDiscountAmount = (baseFee * rule.value) / 100;
                            break;
                        default:
                            smartDiscountAmount = 0;
                    }
                }

                smartDiscountAmount = Math.min(smartDiscountAmount, baseFee);
            }

            setSmartDeliveryDiscount(smartDiscountAmount);

            const finalDeliveryFee =
                orderType === "delivery"
                    ? Math.max(baseFee - smartDiscountAmount, 0)
                    : null;

            setEffectiveDeliveryFee(finalDeliveryFee);

            // ── خصم الفاتورة على الـ subtotal ──
            let invoiceDiscountAmount = 0;
            let invoiceDiscountTypeVal: "fixed" | "percentage" = "fixed";

            const invoiceRule = invoiceItemRules.find((r: any) =>
                itemsTotal >= r.min && (r.max === null || itemsTotal <= r.max)
            );

            if (invoiceRule && invoiceRule.value > 0) {
                invoiceDiscountTypeVal = invoiceRule.type;
                if (invoiceRule.type === "percentage") {
                    invoiceDiscountAmount = (subtotal * invoiceRule.value) / 100;
                } else {
                    invoiceDiscountAmount = invoiceRule.value;
                }
                invoiceDiscountAmount = Math.min(invoiceDiscountAmount, subtotal);
            }

            setInvoiceDiscount(invoiceDiscountAmount);
            setInvoiceDiscountType(invoiceDiscountTypeVal);

            const deliveryPart = orderType === "delivery" ? (finalDeliveryFee ?? 0) : 0;
            const finalTotal = Math.floor(subtotal - invoiceDiscountAmount + deliveryPart);


            setSubtotal(subtotal);
            setTotal(finalTotal);
        };

        syncData();

        const interval = setInterval(syncData, 1000);
        return () => clearInterval(interval);
    }, [
        branch.slug,
        deliveryFee,
        orderType,
        discountRules,
        invoiceItemRules,
        settings.deliveryFee
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) return alert(isAr ? "السلة فارغة" : "Cart is empty");

        const name = (document.getElementById('customer-name') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('customer-phone') as HTMLInputElement).value.trim();
        const email = (document.getElementById('customer-email') as HTMLInputElement).value.trim();
        const birthday = (document.getElementById('customer-birthday') as HTMLInputElement)?.value;
        const street = (document.getElementById('customer-street') as HTMLInputElement)?.value.trim() || "";
        const building = (document.getElementById('customer-building') as HTMLInputElement)?.value.trim() || "";
        const addressNotes = (document.getElementById('customer-address-notes') as HTMLInputElement)?.value.trim() || "";
        const address = street ? `${street}, ${building}${addressNotes ? ` (${addressNotes})` : ""}` : "";

        const notes = (document.getElementById('customer-notes') as HTMLTextAreaElement)?.value.trim();
        const scheduledDate = (document.getElementById('scheduled-date') as HTMLInputElement)?.value;
        const scheduledTime = (document.getElementById('scheduled-time') as HTMLInputElement)?.value;
        const scheduledAt = scheduledDate && scheduledTime ? `${scheduledDate} — ${scheduledTime}` : null;
        const policyAccepted = (document.getElementById('policy-accept') as HTMLInputElement).checked;

        if (!name || !phone) {
            return alert(isAr
                ? `يرجى ملأ جميع الحقول الأساسية (الاسم، رقم الهاتف)`
                : `Please fill all required fields (Name, Phone)`
            );
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            return alert(isAr ? 'يجب أن يتكون رقم الهاتف من 10 أرقام (مثلاً: 059xxxxxxx)' : 'Phone number must be exactly 10 digits (e.g., 059xxxxxxx)');
        }

        if (paymentMethod === 'palpay') {
            if (!email) {
                return alert(isAr ? 'يرجى إدخال البريد الإلكتروني لإتمام عملية الدفع' : 'Please enter your email to complete the payment');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return alert(isAr ? 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@example.com)' : 'Please enter a valid email address');
            }
        }

        if (orderType === 'delivery' && (!selectedZone || !street || !building)) {
            return alert(isAr ? 'يرجى اختيار منطقة التوصيل وإدخال بيانات الشارع والبناية بالتفصيل' : 'Please select a delivery zone and enter street and building details');
        }

        if (!policyAccepted) return alert(isAr ? 'يجب الموافقة على الشروط والسياسات للمتابعة' : 'You must accept the terms and policies to continue');

        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (siteKey && !captchaToken) {
            return alert(isAr ? "يرجى تأكيد أنك لست روبوت" : "Please confirm you are not a bot");
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const items = (window as any).Cart.getItems(branch.slug);
            setCartItems(items);
            const freshItemsTotal = (window as any).Cart.getTotal(branch.slug);

            const baseFee = orderType === 'delivery' ? (deliveryFee ?? settings.deliveryFee ?? 0) : 0;
            const freshEffectiveFee = orderType === 'delivery' ? Math.max(baseFee - smartDeliveryDiscount, 0) : 0;

            // إعادة حساب خصم الفاتورة لحظة الإرسال
            let freshInvoiceDiscount = 0;
            let freshInvoiceDiscountType: "fixed" | "percentage" = "fixed";
            const freshInvoiceRule = invoiceItemRules.find((r: any) =>
                freshItemsTotal >= r.min && (r.max === null || freshItemsTotal <= r.max)
            );
            if (freshInvoiceRule && freshInvoiceRule.value > 0) {
                freshInvoiceDiscountType = freshInvoiceRule.type;
                freshInvoiceDiscount = freshInvoiceRule.type === "percentage"
                    ? (freshItemsTotal * freshInvoiceRule.value) / 100
                    : freshInvoiceRule.value;
                freshInvoiceDiscount = Math.min(freshInvoiceDiscount, freshItemsTotal);
            }

            const freshTotal = Math.floor(freshItemsTotal - freshInvoiceDiscount + freshEffectiveFee);

            const finalAddress = orderType === 'delivery' ? `${selectedZone} - ${address}` : address;

            saveCustomer({
                name,
                phone,
                email,
                street,
                building,
                addressNotes,
                lastZone: selectedZone,
            });

            // ✅ حفظ الداتا بيز (بدون تغيير لضمان عمل page.tsx بشكل صحيح)
            const mappedItems = items.map((i: any) => {
                // كشف الوجبة العائلية — الـ note بتحتوي JSON من نوع family_meal
                let familyData: any = null;
                try {
                    if (i.note) {
                        const parsed = JSON.parse(i.note);
                        if (parsed?.type === 'family_meal') familyData = parsed;
                    }
                } catch (_) { }

                if (familyData) {
                    return {
                        ...i,
                        addonDetails: i.note, // نخزن الـ JSON كما هو في addon_details
                        originalPrice: i.originalPrice ?? i.finalPrice
                    };
                }

                // المنتجات العادية — المنطق الحالي
                const withoutAddons = i.selectedAddOns?.filter((a: any) =>
                    a.groupType === 'Without' ||
                    (a.nameAr || '').includes('بدون')
                );

                const parts: string[] = [];

                if (i.selectedSize)
                    parts.push(`${isAr ? 'الحجم' : 'Size'}: ${isAr ? i.selectedSize.nameAr : i.selectedSize.nameEn}`);

                if (i.selectedType)
                    parts.push(`${isAr ? 'النوع' : 'Type'}: ${isAr ? i.selectedType.nameAr : i.selectedType.nameEn}`);

                const addonsByGroup: Record<string, { nameAr: string; nameEn: string; items: string[] }> = {};
                i.selectedAddOns?.forEach((a: any) => {
                    const isWithout = a.groupType === 'Without' || (a.nameAr || '').includes('بدون');
                    if (isWithout) return;
                    const groupKey = a.groupNameAr || a.groupType || 'إضافات';
                    if (!addonsByGroup[groupKey]) {
                        addonsByGroup[groupKey] = {
                            nameAr: a.groupNameAr || groupKey,
                            nameEn: a.groupNameEn || a.groupType || 'Addons',
                            items: []
                        };
                    }
                    addonsByGroup[groupKey].items.push(isAr ? (a.nameAr || '') : (a.nameEn || ''));
                });

                Object.values(addonsByGroup).forEach(group => {
                    if (group.items.length)
                        parts.push(`${isAr ? group.nameAr : group.nameEn}: ${group.items.join(' + ')}`);
                });

                if (withoutAddons?.length)
                    parts.push(`${isAr ? 'بدون' : 'Without'}: ${withoutAddons.map((a: any) => (isAr ? a.nameAr : a.nameEn).replace('🚫', '').trim()).join('، ')}`);

                if (i.note)
                    parts.push(`${isAr ? 'ملاحظة' : 'Note'}: ${i.note}`);

                return { ...i, addonDetails: parts.join(' | '), originalPrice: i.originalPrice ?? i.finalPrice };
            });

            // ✅ حفظ الطلب — يعمل لكل أنواع الطلبات (delivery + inRestaurant)
            console.log("mappedItems sample:", JSON.stringify(mappedItems[0], null, 2));

            const res = await saveOrderAction({
                branchId: branch.id,
                customerName: name,
                customerPhone: phone,
                customerEmail: email,
                orderType: orderType === 'delivery' ? 'Delivery' : 'Pickup',
                address: finalAddress,
                tableNumber: null,
                totalAmount: freshTotal,
                deliveryFee: freshEffectiveFee,
                invoiceDiscountAmount: freshInvoiceDiscount,
                invoiceDiscountType: freshInvoiceDiscountType,
                paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Card',
                scheduledAt: scheduledAt
            }, mappedItems, captchaToken || undefined);

            console.log("[Checkout] Order Save Result:", res);

            if (!res.success || !res.orderId) {
                alert(isAr
                    ? `فشل حفظ الطلب: ${res.error || 'خطأ غير متوقع، يرجى المحاولة مرة أخرى'}`
                    : `Failed to save order: ${res.error || 'Unexpected error, please try again'}`
                );
                setIsSubmitting(false);
                return;
            }

            if (res.isDemo && typeof window !== "undefined") {
                const demoStore = {
                    customer_name: name,
                    order_type: orderType === 'delivery' ? 'Delivery' : 'Pickup',
                    total_amount: freshTotal,
                    order_items: items.map((i: any) => ({
                        product_name_ar: i.nameAr,
                        product_name_en: i.nameEn,
                        quantity: i.quantity,
                        price: i.finalPrice
                    })),
                    branches: { discount_percent: branch.discountPercent },
                    method: paymentMethod
                };
                sessionStorage.setItem(`demo_order_${res.orderId}`, JSON.stringify(demoStore));
            }

            if (paymentMethod === "palpay") {
                console.log(`[Checkout] Initiating online payment for ${freshTotal} ${settings.currencySymbol || '₪'}`);

                const payRes = await fetch("/api/payments/lahza/initiate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: res.orderId,
                        email: email || "customer@uptownps.com",
                        amount: freshTotal,
                        currency: settings.currencySymbol === "₪" ? "ILS" : settings.currencySymbol || "USD",
                        customerName: name,
                        customerPhone: phone,
                        branchSlug: branch.slug
                    })
                });

                const payData = await payRes.json();
                console.log("🚀 Lahza API Response:", payData);

                if (!payData.success) {
                    throw new Error(payData.error || "Lahza initiation failed");
                }

                if (payData.authorizationUrl) {
                    console.log("🔗 Redirecting to:", payData.authorizationUrl);
                    // ✅ احفظ الطلب عشان نكشف الإلغاء لما يرجع
                    sessionStorage.setItem("pending_order_id", res.orderId.toString());
                    sessionStorage.setItem("pending_order_slug", branch.slug);
                    window.location.href = payData.authorizationUrl;
                } else {
                    alert(isAr ? "عذراً، لم نتمكن من الحصول على رابط الدفع." : "Error: Could not obtain payment URL.");
                    setIsSubmitting(false);
                }
            } else {
                // ✅ Cash — يعمل لكل أنواع الطلبات
                try {
                    const audio = new Audio('/sounds/success.mp3');
                    audio.play().catch(e => console.log("Sound play error", e));
                } catch (e) { }

                const orderTypeLabel = orderType === 'delivery' ? (isAr ? 'توصيل' : 'Delivery') : (isAr ? 'استلام' : 'Pickup');

                // 🚀 تعديل التنسيق حصرياً لرسالة الواتساب 🚀
                const itemsTxt = mappedItems.map((i: any) => {
                    let formattedDetails = '';

                    if (i.addonDetails) {
                        // كشف الوجبة العائلية — JSON
                        let familyData: any = null;
                        try {
                            const parsed = JSON.parse(i.addonDetails);
                            if (parsed?.type === 'family_meal') familyData = parsed;
                        } catch (_) { }

                        if (familyData) {
                            formattedDetails = familyData.burgers.map((burger: any) => {
                                const typeName = isAr ? burger.typeAr : burger.typeEn;
                                const addons = burger.addons.map((a: any) => `➕ ${isAr ? a.nameAr : a.nameEn}`).join(' ');
                                const without = burger.without.length
                                    ? `🚫 ${isAr ? 'بدون' : 'Without'}: ${burger.without.map((w: any) => isAr ? w.nameAr : w.nameEn).join('، ')}`
                                    : '';
                                const parts = [typeName, addons, without].filter(Boolean).join(' | ');
                                return `   🍔 *${isAr ? `بيرجر ${burger.index}` : `Burger ${burger.index}`}:* ${parts || (isAr ? 'بدون تخصيص' : 'No customization')}`;
                            }).join('%0A');
                            if (familyData.note) formattedDetails += `%0A   📝 ${familyData.note}`;
                        } else {
                            // الأصناف العادية
                            formattedDetails = i.addonDetails.split(' | ').map((part: string) => {
                                const isWithout = part.startsWith('بدون') || part.startsWith('Without') || part.startsWith('🚫');
                                return `   ${isWithout ? '🚫' : '•'} ${part.replace('🚫', '').trim()}`;
                            }).join('%0A');
                        }
                    }

                    return `* ${i.quantity}x ${isAr ? i.nameAr : i.nameEn} (${i.finalPrice} ₪)*${formattedDetails ? `%0A${formattedDetails}` : ''}`;
                }).join('%0A%0A');

                const scheduledLine = scheduledAt ? `%0A*وقت التجهيز المجددل:* ${scheduledAt}` : '';
                const msg = `*طلب جديد من UPTOWN*%0A%0A` +
                    `*العميل:* ${name}%0A` +
                    `*الهاتف:* ${phone}%0A` +
                    `*نوع الطلب:* ${orderTypeLabel}%0A` +
                    `${orderType === 'delivery' ? `*العنوان:* ${finalAddress}` : ''}${scheduledLine}%0A%0A` +
                    `*الأصناف:*%0A${itemsTxt}%0A%0A` +
                    `*المجموع:* ${freshTotal} ₪%0A%0A` +
                    `_تم إرسال الطلب عبر الموقع الإلكتروني_`;

                const waLink = `https://wa.me/${branch.whatsApp.replace(/\+/g, '').replace(/\s/g, '')}?text=${msg}`;

                window.open(waLink, '_blank');
                window.location.href = `/checkout/success?orderId=${res.orderId}&branchSlug=${branch.slug}&method=cash`;
            }

        } catch (err: any) {
            alert(isAr ? "عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." : "Critical Error: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="uptown-checkout-wrapper" style={{ margin: '0 auto', background: '#fff' }}>
            <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 1px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '5px' }}>{isAr ? 'إتمام الطلب' : 'Checkout'}</h1>
                    <p style={{ fontWeight: 800, color: '#8b0000', fontSize: '1rem', marginBottom: '15px' }}>{isAr ? branch.nameAr : branch.nameEn}</p>
                    <button onClick={() => window.history.back()} style={{ color: '#666', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>{isAr ? '← رجوع للقائمة' : '← Back to Menu'}</button>
                </div>

                {!isOpen && (
                    <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '24px',
                        padding: '24px',
                        marginBottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        boxShadow: '0 10px 30px rgba(220, 38, 38, 0.05)'
                    }}>
                        <div style={{ background: '#DC2626', color: '#fff', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <h4 style={{ color: '#991B1B', fontWeight: 900, marginBottom: '5px' }}>{isAr ? 'المطعم مغلق حالياً' : 'Restaurant Currently Closed'}</h4>
                            <p style={{ color: '#B91C1C', fontSize: '14px', fontWeight: 600 }}>
                                {isAr
                                    ? `نعتذر منك، ساعات العمل في هذا الفرع من ${branch.openingTime} حتى ${branch.closingTime}. يمكنك تصفح المنيو ولكن لا يمكن استقبال طلبات حالياً.`
                                    : `We apologize, this branch operates from ${branch.openingTime} to ${branch.closingTime}. You can browse the menu but cannot place orders at this time.`
                                }
                            </p>
                        </div>
                    </div>
                )}

                <div className="checkout-main-grid" style={{ background: '#FDFCFB', padding: '40px', borderRadius: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #ECEAE7' }}>

                    {/* 📋 ORDER TYPE */}
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ fontWeight: 800, marginBottom: '20px', fontSize: '1.2rem' }}>{isAr ? 'نوع الطلب' : 'Order Type'}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div onClick={() => setOrderType('inRestaurant')} className={`premium-choice-card ${orderType === 'inRestaurant' ? 'active' : ''}`}>
                                <Utensils size={32} />
                                <span>{isAr ? 'استلام من الفرع' : 'Pickup at Branch'}</span>
                            </div>
                            <div onClick={() => setOrderType('delivery')} className={`premium-choice-card ${orderType === 'delivery' ? 'active' : ''}`}>
                                <Truck size={32} />
                                <span>{isAr ? 'توصيل' : 'Delivery'}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                            <div className="uptown-input-group">
                                <label>{isAr ? 'الاسم الكامل' : 'Full Name'} *</label>
                                <input type="text" id="customer-name" required className="uptown-input" />
                            </div>
                            <div className="uptown-input-group">
                                <label>{isAr ? 'رقم الهاتف' : 'Phone'} *</label>
                                <input
                                    type="tel"
                                    id="customer-phone"
                                    required
                                    className="uptown-input"
                                    dir="ltr"
                                    placeholder="05..."
                                    pattern="[0-9]{10}"
                                    minLength={10}
                                    maxLength={10}
                                    onInput={(e) => {
                                        const el = e.target as HTMLInputElement;
                                        el.value = el.value.replace(/[^0-9]/g, '');
                                    }}
                                />
                            </div>
                            <div className="uptown-input-group" style={{ gridColumn: paymentMethod === 'palpay' ? 'span 2' : 'auto' }}>
                                <label>
                                    {isAr ? 'البريد الإلكتروني' : 'Email'}
                                    {paymentMethod === 'palpay' ? ' *' : ` (${isAr ? 'اختياري' : 'Optional'})`}
                                </label>
                                <input
                                    type="email"
                                    id="customer-email"
                                    className="uptown-input"
                                    required={paymentMethod === 'palpay'}
                                    placeholder={paymentMethod === 'palpay' ? "example@gmail.com" : ""}
                                    suppressHydrationWarning
                                />
                                {paymentMethod === 'palpay' && (
                                    <p style={{ fontSize: '12px', color: '#8B0000', marginTop: '5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Info size={14} />
                                        {isAr
                                            ? 'ضروري جداً لإرسال تفاصيل الدفع وفاتورة الطلب إليك.'
                                            : 'Required to send payment details and order receipt to you.'}
                                    </p>
                                )}
                            </div>
                            <div className="uptown-input-group">
                                <label>{isAr ? 'تاريخ الميلاد' : 'Birth Date'} ({isAr ? 'اختياري' : 'Optional'})</label>
                                <input type="date" id="customer-birthday" className="uptown-input" />
                            </div>

                            {orderType === 'delivery' && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontWeight: 800, marginBottom: '10px' }}>{isAr ? 'منطقة التوصيل' : 'Delivery Zone'} <span className="required-star">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="uptown-input premium-select"
                                            style={{ width: '100%', cursor: 'pointer', backgroundPosition: 'left 20px center' }}
                                            value={selectedZone}
                                            onChange={(e) => {
                                                const zone = branch.deliveryZones?.find(z => (isAr ? (z.nameAr || (z as any).name) : (z.nameEn || (z as any).name)) === e.target.value);
                                                if (zone) {
                                                    setDeliveryFee(zone.fee);
                                                    setSelectedZone(e.target.value);
                                                } else {
                                                    setDeliveryFee(0);
                                                    setSelectedZone("");
                                                }
                                            }}
                                        >
                                            <option value="">{isAr ? '--- اختر المنطقة ---' : '--- Choose Zone ---'}</option>
                                            {(branch.deliveryZones ?? []).length > 0 ? (branch.deliveryZones ?? []).map((z, zIdx) => {
                                                const zoneName = isAr ? z.nameAr : z.nameEn;
                                                if (!zoneName) return null;
                                                const feeText = z.fee === 0
                                                    ? (isAr ? 'مجاناً' : 'Free')
                                                    : `+${z.fee} ${settings.currencySymbol}`;
                                                return <option key={`zone-${zIdx}`} value={zoneName}>{zoneName} ({feeText})</option>;
                                            }) : <option value="Manual" disabled>{isAr ? 'المناطق غير متاحة حالياً' : 'Zones momentarily unavailable'}</option>}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                                        <div className="uptown-input-group">
                                            <label>{isAr ? 'اسم الشارع' : 'Street Name'} *</label>
                                            <input type="text" id="customer-street" required className="uptown-input" />
                                        </div>
                                        <div className="uptown-input-group">
                                            <label>{isAr ? 'البناية / الشقة' : 'Building / Apt'} *</label>
                                            <input type="text" id="customer-building" required className="uptown-input" />
                                        </div>
                                    </div>
                                    <div className="uptown-input-group" style={{ marginTop: '20px' }}>
                                        <label>{isAr ? 'ملاحظات العنوان' : 'Address Notes'} ({isAr ? 'اختياري' : 'Optional'})</label>
                                        <input type="text" id="customer-address-notes" className="uptown-input" placeholder={isAr ? "مثلاً: قرب سوبرماركت..." : "e.g. Near supermarket..."} />
                                    </div>
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Clock size={20} color="#0284C7" />
                                        <span style={{ color: '#0369A1', fontWeight: 800, fontSize: '14px' }}>
                                            {isAr ? 'وقت التوصيل المتوقع: حوالي نصف ساعة (30 دقيقة)' : 'Expected Delivery Time: About 30 minutes'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 🕐 SCHEDULED ORDER TIME */}
                            <div style={{ gridColumn: 'span 2', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '20px', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                    <Clock size={18} color="#D97706" />
                                    <span style={{ fontWeight: 900, fontSize: '14px', color: '#92400E' }}>
                                        {isAr ? 'جدولة الطلب (اختياري)' : 'Schedule Order (Optional)'}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="uptown-input-group">
                                        <label style={{ color: '#92400E' }}>{isAr ? 'التاريخ' : 'Date'}</label>
                                        <input
                                            type="date"
                                            id="scheduled-date"
                                            className="uptown-input"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="uptown-input-group">
                                        <label style={{ color: '#92400E' }}>{isAr ? 'الوقت' : 'Time'}</label>
                                        <input type="time" id="scheduled-time" className="uptown-input" />
                                    </div>
                                </div>
                                <p style={{ fontSize: '12px', color: '#B45309', marginTop: '10px', fontWeight: 600 }}>
                                    {isAr
                                        ? '⚡ اتركه فارغاً للتجهيز الفوري، أو حدد وقتاً لاحقاً لطلبك.'
                                        : '⚡ Leave empty for immediate preparation, or set a future time for your order.'}
                                </p>
                            </div>

                            <div className="uptown-input-group" style={{ gridColumn: 'span 2' }}>
                                <label>{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
                                <textarea id="customer-notes" rows={3} className="uptown-input" />
                            </div>
                        </div>

                        {/* 📦 SUMMARY BOX */}
                        <div style={{ background: '#fff', border: '1px solid #eee', padding: '30px', borderRadius: '30px', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '15px', marginBottom: '15px' }}>
                                <span style={{ fontWeight: 800 }}>
                                    {cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)} {isAr ? 'أصناف في السلة' : 'Items'}
                                </span>
                                <span style={{ color: '#666', fontSize: '14px' }}>{isAr ? 'المجموع' : 'Subtotal'}: {subtotal.toFixed(2)}</span>
                            </div>
                            {cartItems.map((item: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', color: '#666' }}>
                                    <span>{item.quantity}x {isAr ? item.nameAr : item.nameEn}</span>
                                    <span>{item.finalPrice.toFixed(2)}</span>
                                </div>
                            ))}

                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
                                {discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#059669', fontWeight: 700, marginBottom: '8px' }}>
                                        <span>{isAr ? 'خصم العرض' : 'Discount'} ({branch.discountPercent}%)</span>
                                        <span>-{discount.toFixed(2)} {settings.currencySymbol}</span>
                                    </div>
                                )}
                                {invoiceDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#059669', fontWeight: 700, marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Sparkles size={14} />
                                            <span>
                                                {isAr ? 'خصم الفاتورة' : 'Invoice Discount'}
                                                {invoiceDiscountType === 'percentage'
                                                    ? ` (${invoiceItemRules.find((r: any) => subtotal >= r.min && (r.max === null || subtotal <= r.max))?.value ?? ''}%)`
                                                    : ''}
                                            </span>
                                        </div>
                                        <span>-{invoiceDiscount.toFixed(2)} {settings.currencySymbol}</span>
                                    </div>
                                )}
                                {orderType === 'delivery' && smartDeliveryDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#059669', fontWeight: 700, marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Sparkles size={14} />
                                            <span>{isAr ? 'خصم التوصيل' : 'Delivery Discount'}</span>
                                        </div>
                                        <span>-{smartDeliveryDiscount.toFixed(2)} {settings.currencySymbol}</span>
                                    </div>
                                )}
                                {orderType === 'delivery' && selectedZone && effectiveDeliveryFee !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                                        <span>{isAr ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                                        {(effectiveDeliveryFee ?? 0) <= 0 ? (
                                            <span style={{ color: '#059669', fontWeight: 800 }}>
                                                {isAr ? '🎉 مجاني' : '🎉 Free'}
                                            </span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {smartDeliveryDiscount > 0 && (
                                                    <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '12px' }}>
                                                        {deliveryFee.toFixed(2)}
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: 800 }}>
                                                    {effectiveDeliveryFee.toFixed(2)} ₪
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: '#8B0000', fontWeight: 900, marginTop: '10px' }}>
                                    <span>{isAr ? 'المجموع النهائي' : 'Grand Total'}</span>
                                    <span>{(total || 0).toFixed(0)} {settings.currencySymbol}</span>
                                </div>
                            </div>
                        </div>

                        {/* 💳 PAYMENT */}
                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ fontWeight: 800, marginBottom: '20px', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'اختر طريقة الدفع' : 'Choose Payment Method'}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div onClick={() => setPaymentMethod('cash')} className={`premium-choice-card ${paymentMethod === 'cash' ? 'active' : ''}`} style={{ padding: '25px' }}>
                                    <Banknote size={36} />
                                    <span style={{ fontSize: '14px', marginTop: '10px' }}>{isAr ? 'الدفع كاش' : 'Cash Payment'}</span>
                                </div>
                                <div onClick={() => setPaymentMethod('palpay')} className={`premium-choice-card ${paymentMethod === 'palpay' ? 'active' : ''}`} style={{ padding: '25px' }}>
                                    <CreditCard size={36} />
                                    <span style={{ fontSize: '14px', marginTop: '10px' }}>{isAr ? 'الدفع بالفيزا' : 'Visa Payment'}</span>
                                </div>
                            </div>
                        </div>

                        {paymentMethod === 'palpay' && (
                            <div style={{ background: '#fff', padding: '25px', borderRadius: '30px', border: '2px solid #EEE', marginBottom: '40px', textAlign: 'center' }}>
                                <p style={{ fontWeight: 600, color: '#666' }}>
                                    {isAr ? "سيتم توجيهك إلى بوابة الدفع الآمنة لإتمام العملية." : "You will be redirected to our secure payment gateway to complete your request."}
                                </p>
                            </div>
                        )}

                        <div style={{ marginBottom: '30px', padding: '15px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
                            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                                <input type="checkbox" id="policy-accept" required style={{ width: '22px', height: '22px', marginTop: '3px', accentColor: '#8B0000' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#444', lineHeight: '1.5' }}>
                                    {isAr ? (
                                        <>
                                            أوافق على <a href="/policies/return" target="_blank" style={{ color: '#8B0000', textDecoration: 'underline' }}>سياسة الإرجاع والتبديل</a> و <a href="/policies/privacy" target="_blank" style={{ color: '#8B0000', textDecoration: 'underline' }}>سياسة الخصوصية</a>
                                        </>
                                    ) : (
                                        <>
                                            I accept the <a href="/policies/return" target="_blank" style={{ color: '#8B0000', textDecoration: 'underline' }}>Return & Exchange Policy</a> and <a href="/policies/privacy" target="_blank" style={{ color: '#8B0000', textDecoration: 'underline' }}>Privacy Policy</a>
                                        </>
                                    )}
                                </span>
                            </label>
                        </div>

                        {/* 🛡️ reCAPTCHA */}
                        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
                                <ReCAPTCHA
                                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                                    onChange={(token) => setCaptchaToken(token)}
                                    hl={isAr ? 'ar' : 'en'}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                type="submit"
                                className="uptown-btn red-gradient"
                                disabled={isSubmitting || (!!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !captchaToken)}
                                style={{
                                    opacity: (isSubmitting || (!!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !captchaToken)) ? 0.6 : 1,
                                    cursor: (isSubmitting || (!!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !captchaToken)) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <CheckCircle2 color="#fff" />
                                {!isOpen
                                    ? (isAr ? 'إرسال الطلب (المطعم مغلق)' : 'Send Order (Closed Now)')
                                    : (isSubmitting
                                        ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                                        : (paymentMethod === 'palpay'
                                            ? (isAr ? 'المتابعة للدفع الإلكتروني' : 'Continue to Online Payment')
                                            : (isAr ? 'إرسال الطلب' : 'Send Order')))}
                            </button>
                        </div>
                    </form>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                .premium-choice-card {
                    background: #fff; border: 2px solid #ECEAE7; border-radius: 25px; 
                    padding: 30px 20px; display: flex; flex-direction: column; align-items: center; 
                    gap: 15px; cursor: pointer; transition: all 0.3s ease; text-align: center;
                }
                .premium-choice-card.active {
                    background: #FDF4F4; border-color: #8B0000; color: #8B0000; box-shadow: 0 10px 30px rgba(139,0,0,0.1);
                }
                .premium-choice-card.sm { padding: 15px; border-radius: 18px; flex-direction: row; justify-content: center; }
                .premium-choice-card span { font-weight: 800; }
                
                .uptown-input-group { display: flex; flex-direction: column; gap: 8px; }
                .uptown-input-group label { font-size: 13px; font-weight: 800; color: #1a1a1a; padding-right: 5px; }
                .uptown-input { 
                    padding: 16px 20px; border-radius: 18px; border: 1px solid #ECEAE7; 
                    background: #fff; font-size: 15px; font-weight: 600; outline: none; transition: 0.3s;
                }
                .uptown-input:focus { border-color: #8B0000; box-shadow: 0 0 0 4px rgba(139,0,0,0.05); }
                
                .uptown-btn {
                    width: 100%; padding: 20px; border-radius: 25px; border: none; font-size: 18px; 
                    font-weight: 900; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: 0.3s;
                }
                .uptown-btn.red-gradient { 
                    background: linear-gradient(135deg, #8B0000 0%, #B91C1C 100%); 
                    color: #fff; box-shadow: 0 10px 30px rgba(139,0,0,0.3); 
                }
                .uptown-btn:hover { transform: scale(1.02); opacity: 0.95; }
                .uptown-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            ` }} />

                {/* Lahza Payment Script */}
                <Script
                    src="https://js.lahza.io/inline.js"
                    strategy="afterInteractive"
                />
            </div>
        </div>
    );
}