
"use client";

import { useRef, useCallback } from "react";
import { Printer } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
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
  order: any;
}

// ─── HTML Receipt Builder ─────────────────────────────────────────────────────
function buildReceiptHTML(order: PrintOrder): string {
  const date = new Date(order.createdAt).toLocaleString("ar-EG");

  const typeLabel =
    order.orderType === "Delivery" ? "توصيل" :
      order.orderType === "Pickup" ? "استلام" : "طاولة";

  const payLabel =
    order.paymentMethod === "Cash" ? "نقدي" : "بطاقة / إلكتروني";

  const branchName = order.branch?.nameAr || "";
  const items = order.items ?? [];

  const itemsHTML = items.map((item: OrderItem) => {
    const lineTotal = (item.price * item.quantity).toFixed(2);
    const addons = item.addonDetails
      ? item.addonDetails.split(" | ").slice(0, 3)
        .map((p: string) => `<div class="addon">— ${p.trim()}</div>`)
        .join("")
      : "";
    return `
            <div class="item">
                <span class="item-name">${item.productNameAr}</span>
                <span class="item-qty">x${item.quantity}</span>
                <span class="item-price">${lineTotal} ILS</span>
            </div>
            ${addons}
        `;
  }).join("");

  const locationHTML =
    order.orderType === "Delivery" && order.address
      ? `<div class="info-row"><span class="label">العنوان</span><span>${order.address}</span></div>`
      : order.tableNumber
        ? `<div class="info-row"><span class="label">طاولة رقم</span><span>${order.tableNumber}</span></div>`
        : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة #${order.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Cairo', 'Tahoma', Arial, sans-serif;
    font-size: 13px; color: #000; background: #fff;
    width: 72mm; margin: 0 auto; padding: 4mm 2mm; direction: rtl;
  }
  .header { text-align: center; margin-bottom: 6px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: 3px; }
  .branch { font-size: 12px; color: #444; margin-top: 2px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .divider-solid { border: none; border-top: 1.5px solid #000; margin: 6px 0; }
  .info-row { display: flex; justify-content: space-between; align-items: baseline; margin: 3px 0; font-size: 12px; }
  .label { color: #555; font-size: 11px; flex-shrink: 0; margin-left: 4px; }
  .badge { display: inline-block; padding: 1px 7px; border: 1px solid #000; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .items-header { display: flex; justify-content: space-between; font-size: 11px; color: #555; margin-bottom: 4px; }
  .item { display: flex; justify-content: space-between; align-items: baseline; margin: 4px 0; font-size: 12.5px; }
  .item-name { flex: 1; font-weight: 600; }
  .item-qty { color: #555; margin: 0 6px; font-size: 11px; flex-shrink: 0; }
  .item-price { font-weight: 700; flex-shrink: 0; font-size: 12px; }
  .addon { font-size: 11px; color: #666; padding-right: 8px; margin: 1px 0; }
  .total-row { display: flex; justify-content: space-between; align-items: center; margin: 6px 0 4px; }
  .total-label { font-size: 14px; font-weight: 700; }
  .total-amount { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; }
  .footer { text-align: center; margin-top: 8px; font-size: 13px; font-weight: 700; letter-spacing: 1px; }
  .footer-sub { text-align: center; font-size: 10px; color: #666; margin-top: 2px; }
  @media print {
    html, body { width: 72mm; }
    @page { size: 80mm auto; margin: 0; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">UPTOWN</div>
    ${branchName ? `<div class="branch">فرع ${branchName}</div>` : ""}
  </div>
  <hr class="divider-solid"/>
  <div class="info-row"><span class="label">رقم الطلب</span><span style="font-weight:700;">#${order.id}</span></div>
  <div class="info-row"><span class="label">التاريخ</span><span>${date}</span></div>
  <div class="info-row"><span class="label">النوع</span><span class="badge">${typeLabel}</span></div>
  <hr class="divider"/>
  <div class="info-row"><span class="label">الزبون</span><span style="font-weight:600;">${order.customerName}</span></div>
  <div class="info-row"><span class="label">الهاتف</span><span>${order.customerPhone}</span></div>
  ${locationHTML}
  <hr class="divider"/>
  <div class="items-header"><span>الصنف</span><span>السعر</span></div>
  ${itemsHTML}
  <hr class="divider-solid"/>
  <div class="total-row">
    <span class="total-label">المجموع النهائي</span>
    <span class="total-amount">${Math.round(order.totalAmount)} ILS</span>
  </div>
  <div class="info-row"><span class="label">طريقة الدفع</span><span>${payLabel}</span></div>
  <hr class="divider"/>
  <div class="footer">شكراً لزيارتكم</div>
  <div class="footer-sub">نتطلع لرؤيتكم مجدداً</div>
</body>
</html>`;
}

// ─── Silent iFrame Printer ────────────────────────────────────────────────────
//
// لماذا iframe وليس window.open؟
//   - window.open يحتاج تفاعل المستخدم أحياناً ويفتح نافذة مرئية
//   - iframe مخفي في نفس الصفحة → يطبع مباشرة على الطابعة الافتراضية (Cash/Rongta)
//     بدون أي نوافذ منبثقة وبدون الحاجة لـ WinUSB أو WebUSB
//
// متطلبات جانب الكاشير:
//   1. الطابعة "Cash" مضبوطة كـ Default Printer في Windows ✓ (موجودة في الصور)
//   2. المتصفح Chrome أو Edge
//   3. في إعدادات Chrome: "Ask before printing" → Off
//      chrome://settings/content/pdfDocuments  ← اضبطه على "Download PDF files"
//      أو في كل مرة يضغط Ctrl+P يختار "Cash" ويفعّل "Skip print dialog"
//
function printViaSilentIframe(order: PrintOrder): Promise<void> {
  return new Promise((resolve) => {
    // نظّف أي iframe سابق لنفس الغرض
    document.getElementById("__receipt_frame")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__receipt_frame";
    // مخفي تماماً — لا يؤثر على layout الصفحة
    iframe.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const html = buildReceiptHTML(order);

    iframe.onload = () => {
      // ننتظر 700ms لتحميل خط Cairo من Google Fonts
      // إذا لم يتحمل الخط سيستخدم Tahoma (مقبول)
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn("[PrintReceipt] iframe.print() failed, falling back to popup", e);
          // Fallback: popup كحل أخير
          const win = window.open("", "_blank", "width=1,height=1");
          if (win) {
            win.document.write(html);
            win.document.close();
            win.onload = () => {
              win.print();
              win.onafterprint = () => win.close();
            };
          } else {
            alert("يرجى السماح بالنوافذ المنبثقة لهذا الموقع");
          }
        }
        resolve();
      }, 700);
    };

    // اكتب HTML مباشرة في iframe
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      resolve();
    }
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PrintReceiptButton({ order }: Props) {
  const printing = useRef(false);

  const handlePrint = useCallback(async () => {
    if (printing.current) return;
    printing.current = true;
    try {
      await printViaSilentIframe(order as PrintOrder);
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





































// "use client";

// import { useRef, useCallback } from "react";
// import { Printer } from "lucide-react";

// // ─── Types ───────────────────────────────────────────────────────────────────
// interface OrderItem {
//     id: number;
//     orderId: number;
//     productId: number;
//     productNameAr: string;
//     productNameEn: string;
//     quantity: number;
//     price: number;
//     addonDetails: string | null;
// }

// interface PrintOrder {
//     id: number;
//     customerName: string;
//     customerPhone: string;
//     orderType: "Delivery" | "Table" | "Pickup";
//     address: string | null;
//     tableNumber: string | null;
//     totalAmount: number;
//     paymentMethod: "Cash" | "Card" | "palpay";
//     createdAt: string;
//     branch?: { nameAr?: string; nameEn?: string } | null;
//     items?: OrderItem[] | null;
// }

// interface Props {
//     order: any;
// }

// // ─── ESC/POS helpers (WebUSB) ─────────────────────────────────────────────────
// const ESC = 0x1b;
// const GS = 0x1d;

// function cmd(...bytes: number[]): Uint8Array {
//     return new Uint8Array(bytes);
// }

// function encodeText(text: string): Uint8Array {
//     return new TextEncoder().encode(text);
// }

// function buildReceipt(order: PrintOrder): Uint8Array {
//     const chunks: Uint8Array[] = [];
//     const push = (...arrays: Uint8Array[]) => chunks.push(...arrays);

//     push(cmd(ESC, 0x40));
//     push(cmd(ESC, 0x74, 21));

//     push(cmd(ESC, 0x61, 1));
//     push(cmd(GS, 0x21, 0x11));
//     push(encodeText("UPTOWN\n"));
//     push(cmd(GS, 0x21, 0x00));

//     const branchName = order.branch?.nameAr || "";
//     if (branchName) push(encodeText(`فرع ${branchName}\n`));
//     push(encodeText("--------------------------------\n"));

//     push(cmd(ESC, 0x61, 2));
//     const date = new Date(order.createdAt).toLocaleString("ar-EG");
//     push(encodeText(`رقم الطلب: ${order.id}\n`));
//     push(encodeText(`التاريخ: ${date}\n`));

//     const typeLabel =
//         order.orderType === "Delivery" ? "توصيل" :
//             order.orderType === "Pickup" ? "استلام" : "طاولة";
//     push(encodeText(`النوع: ${typeLabel}\n`));
//     push(encodeText("--------------------------------\n"));

//     push(encodeText(`الزبون: ${order.customerName}\n`));
//     push(encodeText(`الهاتف: ${order.customerPhone}\n`));
//     if (order.orderType === "Delivery" && order.address) {
//         push(encodeText(`العنوان: ${order.address}\n`));
//     } else if (order.tableNumber) {
//         push(encodeText(`طاولة رقم: ${order.tableNumber}\n`));
//     }
//     push(encodeText("--------------------------------\n"));

//     const items = order.items ?? [];
//     for (const item of items) {
//         const lineTotal = (item.price * item.quantity).toFixed(2);
//         push(encodeText(`${item.productNameAr} x${item.quantity}  ${lineTotal} ILS\n`));
//         if (item.addonDetails) {
//             const parts = item.addonDetails.split(" | ").slice(0, 3);
//             for (const p of parts) push(encodeText(`  - ${p.trim()}\n`));
//         }
//     }
//     push(encodeText("--------------------------------\n"));

//     push(cmd(GS, 0x21, 0x11));
//     push(encodeText(`المجموع النهائي: ${Math.round(order.totalAmount)} ILS\n`));
//     push(cmd(GS, 0x21, 0x00));

//     const payLabel = order.paymentMethod === "Cash" ? "نقدي" : "بطاقة / إلكتروني";
//     push(encodeText(`طريقة الدفع: ${payLabel}\n`));

//     push(cmd(ESC, 0x61, 1));
//     push(encodeText("--------------------------------\n"));
//     push(encodeText("شكرا لزيارتكم\n"));
//     push(encodeText("\n\n\n\n"));
//     push(cmd(GS, 0x56, 0x41, 0x00));

//     const total = chunks.reduce((n, c) => n + c.length, 0);
//     const merged = new Uint8Array(total);
//     let offset = 0;
//     for (const c of chunks) { merged.set(c, offset); offset += c.length; }
//     return merged;
// }

// // ─── WebUSB Connection ────────────────────────────────────────────────────────
// declare global {
//     interface Window { _thermalPrinter?: USBDevice; }
// }

// async function getPrinter(): Promise<USBDevice> {
//     if (window._thermalPrinter?.opened) return window._thermalPrinter;

//     const device = await (navigator as any).usb.requestDevice({
//         filters: [
//             { vendorId: 0x0416 }, // Rongta
//             { vendorId: 0x1fc9 },
//             { vendorId: 0x0483 },
//             { vendorId: 0x04b8 }, // Epson
//         ],
//     });

//     await device.open();
//     if (device.configuration === null) await device.selectConfiguration(1);
//     await device.claimInterface(0);
//     window._thermalPrinter = device;
//     return device;
// }

// // ─── HTML Print Fallback (80mm Rongta RP330) ─────────────────────────────────
// function printViaHTML(order: PrintOrder): void {
//     const date = new Date(order.createdAt).toLocaleString("ar-EG");

//     const typeLabel =
//         order.orderType === "Delivery" ? "توصيل" :
//             order.orderType === "Pickup" ? "استلام" : "طاولة";

//     const payLabel =
//         order.paymentMethod === "Cash" ? "نقدي" :
//             order.paymentMethod === "palpay" ? "بطاقة / إلكتروني" : "بطاقة / إلكتروني";

//     const branchName = order.branch?.nameAr || "";
//     const items = order.items ?? [];

//     const itemsHTML = items.map((item) => {
//         const lineTotal = (item.price * item.quantity).toFixed(2);
//         const addons = item.addonDetails
//             ? item.addonDetails.split(" | ").slice(0, 3)
//                 .map((p: string) => `<div class="addon">— ${p.trim()}</div>`)
//                 .join("")
//             : "";
//         return `
//             <div class="item">
//                 <span class="item-name">${item.productNameAr}</span>
//                 <span class="item-qty">x${item.quantity}</span>
//                 <span class="item-price">${lineTotal} ILS</span>
//             </div>
//             ${addons}
//         `;
//     }).join("");

//     const locationHTML =
//         order.orderType === "Delivery" && order.address
//             ? `<div class="info-row"><span class="label">العنوان</span><span>${order.address}</span></div>`
//             : order.tableNumber
//                 ? `<div class="info-row"><span class="label">طاولة رقم</span><span>${order.tableNumber}</span></div>`
//                 : "";

//     const html = `<!DOCTYPE html>
// <html lang="ar" dir="rtl">
// <head>
// <meta charset="UTF-8"/>
// <title>فاتورة #${order.id}</title>
// <style>
//   @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

//   * { margin: 0; padding: 0; box-sizing: border-box; }

//   body {
//     font-family: 'Cairo', 'Tahoma', Arial, sans-serif;
//     font-size: 13px;
//     color: #000;
//     background: #fff;
//     width: 72mm;
//     margin: 0 auto;
//     padding: 4mm 2mm;
//     direction: rtl;
//   }

//   /* ── Header ── */
//   .header {
//     text-align: center;
//     margin-bottom: 6px;
//   }
//   .brand {
//     font-size: 22px;
//     font-weight: 900;
//     letter-spacing: 3px;
//   }
//   .branch {
//     font-size: 12px;
//     color: #444;
//     margin-top: 2px;
//   }

//   /* ── Divider ── */
//   .divider {
//     border: none;
//     border-top: 1px dashed #000;
//     margin: 6px 0;
//   }
//   .divider-solid {
//     border: none;
//     border-top: 1.5px solid #000;
//     margin: 6px 0;
//   }

//   /* ── Info rows ── */
//   .info-row {
//     display: flex;
//     justify-content: space-between;
//     align-items: baseline;
//     margin: 3px 0;
//     font-size: 12px;
//   }
//   .label {
//     color: #555;
//     font-size: 11px;
//     flex-shrink: 0;
//     margin-left: 4px;
//   }

//   /* ── Badge ── */
//   .badge {
//     display: inline-block;
//     padding: 1px 7px;
//     border: 1px solid #000;
//     border-radius: 20px;
//     font-size: 11px;
//     font-weight: 600;
//   }

//   /* ── Items ── */
//   .items-header {
//     display: flex;
//     justify-content: space-between;
//     font-size: 11px;
//     color: #555;
//     margin-bottom: 4px;
//   }
//   .item {
//     display: flex;
//     justify-content: space-between;
//     align-items: baseline;
//     margin: 4px 0;
//     font-size: 12.5px;
//   }
//   .item-name {
//     flex: 1;
//     font-weight: 600;
//   }
//   .item-qty {
//     color: #555;
//     margin: 0 6px;
//     font-size: 11px;
//     flex-shrink: 0;
//   }
//   .item-price {
//     font-weight: 700;
//     flex-shrink: 0;
//     font-size: 12px;
//   }
//   .addon {
//     font-size: 11px;
//     color: #666;
//     padding-right: 8px;
//     margin: 1px 0;
//   }

//   /* ── Total ── */
//   .total-row {
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     margin: 6px 0 4px;
//   }
//   .total-label {
//     font-size: 14px;
//     font-weight: 700;
//   }
//   .total-amount {
//     font-size: 18px;
//     font-weight: 900;
//     letter-spacing: 0.5px;
//   }

//   /* ── Footer ── */
//   .footer {
//     text-align: center;
//     margin-top: 8px;
//     font-size: 13px;
//     font-weight: 700;
//     letter-spacing: 1px;
//   }
//   .footer-sub {
//     text-align: center;
//     font-size: 10px;
//     color: #666;
//     margin-top: 2px;
//   }

//   /* ── Print rules ── */
//   @media print {
//     html, body { width: 72mm; }
//     @page {
//       size: 80mm auto;
//       margin: 0;
//     }
//   }
// </style>
// </head>
// <body>

//   <!-- Header -->
//   <div class="header">
//     <div class="brand">UPTOWN</div>
//     ${branchName ? `<div class="branch">فرع ${branchName}</div>` : ""}
//   </div>

//   <hr class="divider-solid"/>

//   <!-- Order Info -->
//   <div class="info-row">
//     <span class="label">رقم الطلب</span>
//     <span style="font-weight:700;">#${order.id}</span>
//   </div>
//   <div class="info-row">
//     <span class="label">التاريخ</span>
//     <span>${date}</span>
//   </div>
//   <div class="info-row">
//     <span class="label">النوع</span>
//     <span class="badge">${typeLabel}</span>
//   </div>

//   <hr class="divider"/>

//   <!-- Customer -->
//   <div class="info-row">
//     <span class="label">الزبون</span>
//     <span style="font-weight:600;">${order.customerName}</span>
//   </div>
//   <div class="info-row">
//     <span class="label">الهاتف</span>
//     <span>${order.customerPhone}</span>
//   </div>
//   ${locationHTML}

//   <hr class="divider"/>

//   <!-- Items -->
//   <div class="items-header">
//     <span>الصنف</span>
//     <span>السعر</span>
//   </div>
//   ${itemsHTML}

//   <hr class="divider-solid"/>

//   <!-- Total -->
//   <div class="total-row">
//     <span class="total-label">المجموع النهائي</span>
//     <span class="total-amount">${Math.round(order.totalAmount)} ILS</span>
//   </div>
//   <div class="info-row">
//     <span class="label">طريقة الدفع</span>
//     <span>${payLabel}</span>
//   </div>

//   <hr class="divider"/>

//   <!-- Footer -->
//   <div class="footer">شكراً لزيارتكم</div>
//   <div class="footer-sub">نتطلع لرؤيتكم مجدداً</div>

//   <script>
//     window.onload = function() {
//       window.print();
//       // أغلق النافذة بعد الطباعة (اختياري)
//       window.onafterprint = function() { window.close(); };
//     };
//   </script>
// </body>
// </html>`;

//     const win = window.open("", "_blank", "width=400,height=600");
//     if (!win) {
//         alert("يرجى السماح بفتح النوافذ المنبثقة لهذا الموقع");
//         return;
//     }
//     win.document.write(html);
//     win.document.close();
// }

// // ─── Main Component ───────────────────────────────────────────────────────────
// export function PrintReceiptButton({ order }: Props) {
//     const printing = useRef(false);

//     const handlePrint = useCallback(async () => {
//         if (printing.current) return;
//         printing.current = true;

//         try {
//             // ── محاولة WebUSB أولاً ──────────────────────────────────────────
//             const device = await getPrinter();
//             const data = buildReceipt(order as PrintOrder);

//             const iface = device.configuration!.interfaces[0];
//             const alt = iface.alternates[0];
//             const ep = alt.endpoints.find(
//                 (e) => e.direction === "out" && e.type === "bulk"
//             );

//             if (!ep) throw new Error("لم يتم العثور على مخرج للطابعة");

//             await device.transferOut(ep.endpointNumber, data as any);

//         } catch (err: any) {
//             // ── WebUSB فشل → fallback إلى نافذة الطباعة ─────────────────────
//             // NotFoundError   = ألغى المستخدم نافذة الاختيار
//             // NotSupportedError / SecurityError = لا يوجد WinUSB driver
//             // NotAllowedError  = جهاز تحت تعريف ويندوز العادي (حالتنا)
//             const skipFallback = err?.name === "NotFoundError";
//             if (!skipFallback) {
//                 printViaHTML(order as PrintOrder);
//             }
//         } finally {
//             printing.current = false;
//         }
//     }, [order]);

//     return (
//         <button
//             onClick={handlePrint}
//             title="طباعة الفاتورة"
//             style={{
//                 width: "32px",
//                 height: "32px",
//                 borderRadius: "8px",
//                 border: "none",
//                 background: "#f0fdf4",
//                 color: "#15803d",
//                 cursor: "pointer",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//             }}
//         >
//             <Printer size={14} />
//         </button>
//     );
// }





