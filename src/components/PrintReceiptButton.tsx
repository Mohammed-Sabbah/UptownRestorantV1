"use client";

import { useRef, useCallback } from "react";
import { Printer } from "lucide-react";

// ─── Types القادمة من مشروعك ─────────────────────────────────────────────────
interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    productNameAr: string;
    productNameEn: string;
    quantity: number;
    price: number;
    addonDetails: string | null;
}

interface PrintOrder {
    id: number;
    customerName: string;
    customerPhone: string;
    orderType: "Delivery" | "Table" | "Pickup";
    address: string | null;
    tableNumber: string | null;
    totalAmount: number;
    paymentMethod: "Cash" | "Card" | "palpay";
    createdAt: string;
    branch?: { nameAr?: string; nameEn?: string } | null;
    items?: OrderItem[] | null;
}

interface Props {
    order: any; // نستخدم any هنا لضمان التوافق التام عند التمرير من الأب
}

// ─── ESC/POS helpers (WebUSB) ─────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

function cmd(...bytes: number[]): Uint8Array {
    return new Uint8Array(bytes);
}

function encodeText(text: string): Uint8Array {
    // إرسال النص بصيغة UTF-8
    return new TextEncoder().encode(text);
}

function buildReceipt(order: PrintOrder): Uint8Array {
    const chunks: Uint8Array[] = [];
    const push = (...arrays: Uint8Array[]) => chunks.push(...arrays);

    // 1. تهيئة الطابعة
    push(cmd(ESC, 0x40));

    // 2. ضبط صفحة الترميز لـ UTF-8 (متوافق مع Rongta)
    push(cmd(ESC, 0x74, 21));

    // ── Header (العنوان) ───────────────────────────────────────────────────────
    push(cmd(ESC, 0x61, 1)); // توسيط
    push(cmd(GS, 0x21, 0x11)); // خط عريض وكبير
    push(encodeText("UPTOWN\n"));
    push(cmd(GS, 0x21, 0x00)); // خط عادي

    const branchName = order.branch?.nameAr || "";
    if (branchName) {
        push(encodeText(`فرع ${branchName}\n`));
    }
    push(encodeText("--------------------------------\n"));

    // ── Order Info (معلومات الطلب) ─────────────────────────────────────────────
    push(cmd(ESC, 0x61, 2)); // محاذاة لليمين
    const date = new Date(order.createdAt).toLocaleString("ar-EG");
    push(encodeText(`رقم الطلب: ${order.id}\n`));
    push(encodeText(`التاريخ: ${date}\n`));

    const typeLabel = order.orderType === "Delivery" ? "توصيل" :
        order.orderType === "Pickup" ? "استلام" : "طاولة";
    push(encodeText(`النوع: ${typeLabel}\n`));
    push(encodeText("--------------------------------\n"));

    // ── Customer (الزبون) ──────────────────────────────────────────────────────
    push(encodeText(`الزبون: ${order.customerName}\n`));
    push(encodeText(`الهاتف: ${order.customerPhone}\n`));
    if (order.orderType === "Delivery" && order.address) {
        push(encodeText(`العنوان: ${order.address}\n`));
    } else if (order.tableNumber) {
        push(encodeText(`طاولة رقم: ${order.tableNumber}\n`));
    }
    push(encodeText("--------------------------------\n"));

    // ── Items (الأصناف) ────────────────────────────────────────────────────────
    const items = order.items ?? [];
    for (const item of items) {
        const lineTotal = (item.price * item.quantity).toFixed(2);
        // استخدام productNameAr من مشروعك
        push(encodeText(`${item.productNameAr} x${item.quantity}  ${lineTotal} ILS\n`));

        if (item.addonDetails) {
            // معالجة الإضافات إذا كانت نصية
            const parts = item.addonDetails.split(" | ").slice(0, 3);
            for (const p of parts) {
                push(encodeText(`  - ${p.trim()}\n`));
            }
        }
    }
    push(encodeText("--------------------------------\n"));

    // ── Totals (المجموع) ───────────────────────────────────────────────────────
    push(cmd(GS, 0x21, 0x11)); // حجم كبير للمجموع
    push(encodeText(`المجموع النهائي: ${Math.round(order.totalAmount)} ILS\n`));
    push(cmd(GS, 0x21, 0x00)); // رجوع للخط العادي

    const payLabel = order.paymentMethod === "Cash" ? "نقدي" : "بطاقة / إلكتروني";
    push(encodeText(`طريقة الدفع: ${payLabel}\n`));

    // ── Footer (الخاتمة) ───────────────────────────────────────────────────────
    push(cmd(ESC, 0x61, 1)); // توسيط
    push(encodeText("--------------------------------\n"));
    push(encodeText("شكرا لزيارتكم\n"));
    push(encodeText("\n\n\n\n")); // مسافة للقص

    // أمر قص الورق التلقائي
    push(cmd(GS, 0x56, 0x41, 0x00));

    // دمج كل البيانات في مصفوفة واحدة
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
    }
    return merged;
}

// ─── WebUSB Connection ───────────────────────────────────────────────────────
declare global {
    interface Window {
        _thermalPrinter?: USBDevice;
    }
}

async function getPrinter(): Promise<USBDevice> {
    if (window._thermalPrinter?.opened) return window._thermalPrinter;

    const device = await (navigator as any).usb.requestDevice({
        filters: [
            { vendorId: 0x0416 }, // Rongta
            { vendorId: 0x1fc9 },
            { vendorId: 0x0483 },
            { vendorId: 0x04b8 }, // Epson
        ],
    });

    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    await device.claimInterface(0);

    window._thermalPrinter = device;
    return device;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function PrintReceiptButton({ order }: Props) {
    const printing = useRef(false);

    const handlePrint = useCallback(async () => {
        if (printing.current) return;
        printing.current = true;
        try {
            const device = await getPrinter();
            const data = buildReceipt(order);

            const iface = device.configuration!.interfaces[0];
            const alt = iface.alternates[0];
            const ep = alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk");

            if (!ep) throw new Error("لم يتم العثور على مخرج للطابعة");

            await device.transferOut(ep.endpointNumber, data as any);
        } catch (err: any) {
            if (err?.name !== "NotFoundError") {
                alert("خطأ في الطباعة: " + (err?.message ?? err));
            }
        } finally {
            printing.current = false;
        }
    }, [order]);

    return (
        <button
            onClick={handlePrint}
            title="طباعة الفاتورة"
            style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "none",
                background: "#f0fdf4",
                color: "#15803d",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Printer size={14} />
        </button>
    );
}