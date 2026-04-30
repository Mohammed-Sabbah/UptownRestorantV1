







// "use client";

// import { useRef, useCallback } from "react";
// import { Printer } from "lucide-react";

// // ─── Types ───────────────────────────────────────────────────────────────────
// interface OrderItem {
//   id: number;
//   orderId: number;
//   productId: number;
//   productNameAr: string;
//   productNameEn: string;
//   quantity: number;
//   price: number;
//   originalPrice: number | null;
//   addonDetails: string | null;
// }

// interface PrintOrder {
//   id: number;
//   customerName: string;
//   customerPhone: string;
//   orderType: "Delivery" | "Table" | "Pickup";
//   address: string | null;
//   tableNumber: string | null;

//   // الأسعار
//   subtotal?: number;                                        // مجموع الأصناف قبل الخصم
//   totalAmount: number;                                      // المجموع النهائي
//   deliveryFee?: number | null;                              // رسوم التوصيل بعد الخصم
//   originalDeliveryFee?: number | null;                      // رسوم التوصيل الأصلية قبل الخصم

//   // خصم الفاتورة (على الأصناف)
//   invoiceDiscountAmount?: number | null;
//   invoiceDiscountType?: "fixed" | "percentage" | null;

//   // خصم التوصيل
//   deliveryDiscountAmount?: number | null;
//   deliveryDiscountType?: string | null;

//   paymentMethod: "Cash" | "Card" | "palpay";
//   createdAt: string;

//   // الفرع — كامل من الـ Branch type
//   branch?: {
//     nameAr?: string;
//     nameEn?: string;
//     phone?: string;
//     whatsApp?: string;
//   } | null;

//   items?: OrderItem[] | null;
//   notes?: string | null;
// }

// interface Props {
//   order: any;
// }

// // ─── Helpers ─────────────────────────────────────────────────────────────────
// function row(label: string, value: string): string {
//   return `<tr>
//     <td class="lbl">${label}</td>
//     <td colspan="2" class="val">${value}</td>
//   </tr>`;
// }

// function dividerSolid(): string {
//   return `<tr><td colspan="3" style="padding:4px 0;">
//     <div style="border-top:1.5px solid #000;"></div>
//   </td></tr>`;
// }

// function dividerDash(): string {
//   return `<tr><td colspan="3" style="padding:4px 0;">
//     <div style="border-top:1px dashed #000;"></div>
//   </td></tr>`;
// }

// // ─── HTML Receipt Builder ─────────────────────────────────────────────────────
// function buildReceiptHTML(order: PrintOrder): string {
//   const date = new Date(order.createdAt).toLocaleString("ar-EG");

//   const typeLabel =
//     order.orderType === "Delivery" ? "توصيل" :
//       order.orderType === "Pickup" ? "استلام" : "طاولة";

//   const payLabel =
//     order.paymentMethod === "Cash" ? "نقدي" :
//       order.paymentMethod === "palpay" ? "إلكتروني (Visa)" : "بطاقة / إلكتروني";

//   const branchNameAr = order.branch?.nameAr || "";
//   const branchPhone = order.branch?.phone || order.branch?.whatsApp || "";

//   const items = order.items ?? [];

//   // ── حساب الأرقام ─────────────────────────────────────────────────────────
//   const subtotal = order.subtotal ?? order.totalAmount;
//   const invoiceDiscount = order.invoiceDiscountAmount ?? 0;
//   const invoiceDiscountType = order.invoiceDiscountType ?? "fixed";
//   const deliveryOriginal = order.originalDeliveryFee ?? order.deliveryFee ?? 0;
//   const deliveryDiscount = order.deliveryDiscountAmount ?? 0;
//   const deliveryFinal = order.deliveryFee ?? 0;
//   const isDelivery = order.orderType === "Delivery";

//   // ── helper: تحويل addon_details لصفوف HTML للطابعة الحرارية ──────────────
//   function renderAddons(addonDetails: string | null): string {
//     if (!addonDetails) return "";
//     try {
//       const parsed = JSON.parse(addonDetails);
//       if (parsed?.type === "family_meal" && Array.isArray(parsed.burgers)) {
//         const burgerRows = parsed.burgers.map((burger: any) => {
//           const typeName = burger.typeAr || burger.typeEn || "";
//           const addonsText = burger.addons?.length
//             ? burger.addons.map((a: any) => a.nameAr || a.nameEn).join("، ")
//             : "";
//           const withoutText = burger.without?.length
//             ? "بدون: " + burger.without.map((w: any) => w.nameAr || w.nameEn).join("، ")
//             : "";
//           let burgerLine = `بيرجر ${burger.index}`;
//           if (typeName) burgerLine += `: ${typeName}`;
//           return `
//             <tr><td colspan="3" style="font-size:9pt; padding:2px 0 0 12px; font-weight:700;">— ${burgerLine}</td></tr>
//             ${addonsText ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 20px;">+ ${addonsText}</td></tr>` : ""}
//             ${withoutText ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 20px;">* ${withoutText}</td></tr>` : ""}
//           `;
//         }).join("");
//         const noteRow = parsed.note
//           ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 12px;">* ${parsed.note}</td></tr>`
//           : "";
//         return burgerRows + noteRow;
//       }
//     } catch (_) { }
//     // fallback — نص عادي مفصول بـ |
//     return addonDetails.split(" | ")
//       .map((p: string) => `<tr><td colspan="3" style="font-size:9pt; padding:1px 0 1px 12px;">— ${p.trim()}</td></tr>`)
//       .join("");
//   }

//   // ── أصناف الطلب ──────────────────────────────────────────────────────────
//   const itemsRows = items.map((item: OrderItem) => {
//     const lineTotal = (item.price * item.quantity).toFixed(2);
//     const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price);
//     const originalLineTotal = hasDiscount ? (Number(item.originalPrice) * item.quantity).toFixed(2) : null;
//     const discountPct = hasDiscount ? Math.round((1 - Number(item.price) / Number(item.originalPrice!)) * 100) : 0;
//     const addons = renderAddons(item.addonDetails);
//     return `
//       <tr>
//         <td style="font-weight:700; padding:3px 0; font-size:10.5pt;">${item.productNameAr}</td>
//         <td style="text-align:center; padding:3px 4px; font-size:10pt;">x${item.quantity}</td>
//         <td style="text-align:left; padding:3px 0; font-size:10pt; word-break:break-word;">
//           ${hasDiscount ? `<span style="text-decoration:line-through; font-weight:400; font-size:9pt;">${originalLineTotal}</span><br>` : ""}
//           <span style="font-weight:700;">${lineTotal}</span>
//           ${hasDiscount ? `<br><span style="font-size:8.5pt; font-weight:700;">خصم ${discountPct}%</span>` : ""}
//         </td>
//       </tr>
//       ${addons}
//     `;
//   }).join("");

//   // ── صف العنوان/الطاولة ────────────────────────────────────────────────────
//   const locationRow =
//     order.orderType === "Delivery" && order.address
//       ? row("العنوان", order.address)
//       : order.tableNumber
//         ? row("طاولة رقم", order.tableNumber)
//         : "";

//   // ── صفوف الأسعار والخصومات ────────────────────────────────────────────────

//   // خصم الفاتورة — يظهر فقط لو موجود
//   const invoiceDiscountLabel = invoiceDiscountType === "percentage"
//     ? `خصم الفاتورة (${order.invoiceDiscountAmount && subtotal ? Math.round((order.invoiceDiscountAmount / subtotal) * 100) : ""}%)`
//     : "خصم الفاتورة";

//   const invoiceDiscountRow = invoiceDiscount > 0 ? `
//     <tr>
//       <td style="padding:2px 0; font-size:10pt;">${invoiceDiscountLabel}</td>
//       <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700; color:#000;">- ${invoiceDiscount.toFixed(2)}</td>
//     </tr>` : "";

//   // رسوم التوصيل — تظهر فقط لو delivery
//   const deliveryRow = isDelivery ? (() => {
//     if (deliveryFinal <= 0) {
//       // مجاني — مع توضيح لو كانت هناك خصم
//       return `<tr>
//         <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
//         <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700;">
//           ${deliveryOriginal > 0 && deliveryDiscount > 0
//           ? `<span style="text-decoration:line-through; font-weight:400; margin-left:4px;">${deliveryOriginal.toFixed(2)}</span> `
//           : ""}
//           مجاني
//         </td>
//       </tr>`;
//     }
//     if (deliveryDiscount > 0) {
//       // في خصم على التوصيل
//       const pct = deliveryOriginal > 0 ? Math.round((deliveryDiscount / deliveryOriginal) * 100) : 0;
//       return `
//         <tr>
//           <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
//           <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt;">
//             <span style="text-decoration:line-through; font-weight:400; margin-left:4px;">${deliveryOriginal.toFixed(2)}</span>
//             <strong>${deliveryFinal.toFixed(2)}</strong>
//           </td>
//         </tr>
//         <tr>
//           <td style="padding:2px 0; font-size:10pt;">خصم التوصيل${pct > 0 ? ` (${pct}%)` : ""}</td>
//           <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700; color:#000;">- ${deliveryDiscount.toFixed(2)}</td>
//         </tr>`;
//     }
//     // تسليم عادي بدون خصم
//     return `<tr>
//       <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
//       <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700;">${deliveryFinal.toFixed(2)}</td>
//     </tr>`;
//   })() : "";

//   return `<!DOCTYPE html>
// <html lang="ar" dir="rtl">
// <head>
// <meta charset="UTF-8"/>
// <title>فاتورة #${order.id}</title>
// <style>
//   * {
//     max-width: 100%;
//     margin: 0; padding: 0; box-sizing: border-box;
//     font-family: 'Tahoma', 'Arial', sans-serif;
//     color: #000;
//     -webkit-print-color-adjust: exact;
//     print-color-adjust: exact;
//   }
//   body {
//     width: 76mm;
//     border: 1px solid red;
//     margin: 0 auto;
//     padding: 3mm 2mm;
//     direction: rtl;
//     font-size: 11pt;
//     background: #fff;
//   }
//   table { width: 100%; border-collapse: collapse; }
//   .logo-img {
//     display: block;
//     margin: 0 auto 3px;
//     width: 52mm;
//     max-width: 100%;
//   }
//   .branch-name {
//     text-align: center;
//     font-size: 10.5pt;
//     font-weight: 700;
//     margin-bottom: 1px;
//   }
//   .branch-phone {
//     text-align: center;
//     font-size: 10pt;
//     margin-bottom: 3px;
//   }
//   .section-title {
//     font-size: 9.5pt;
//     font-weight: 700;
//     margin-bottom: 2px;
//     border-bottom: 1px solid #000;
//     padding-bottom: 2px;
//   }
//   .badge {
//     display: inline-block;
//     border: 1.5px solid #000;
//     padding: 0 5px;
//     font-weight: 700;
//     font-size: 10pt;
//   }
//   td.lbl {
//     text-align: right;
//     padding: 2px 0;
//     font-size: 10.5pt;
//     white-space: nowrap;
//     width: 40%;
//   }
//   td.val {
//     text-align: left;
//     padding: 2px 0 2px 4px;
//     font-size: 10.5pt;
//   }
//   .items-header td {
//     font-weight: 700;
//     font-size: 10pt;
//     border-bottom: 1px solid #000;
//     padding-bottom: 3px;
//   }
//   .total-row td {
//     padding-top: 4px;
//   }
//   .footer {
//     text-align: center;
//     font-size: 12pt;
//     font-weight: 900;
//     margin-top: 5px;
//   }
//   /* ── إعدادات الصفحة للطابعة الحرارية — يجب أن تكون خارج @media print ── */
//   @page {
//     size: 80mm auto;
//     margin: 0;
//   }
//   @media print {
//     html, body {
//       width: 76mm;
//       max-width: 76mm;
//       overflow: hidden;
//       margin: 0;
//       padding: 3mm 2mm;
//     }
//     /* إخفاء أي ترويسة أو تذييل يضيفه المتصفح تلقائياً (مثل التاريخ أو اسم الصفحة) */
//     header, footer, .no-print { display: none !important; }
//   }
// </style>
// </head>
// <body>

//   <!-- ══ HEADER ══ -->
//   <img class="logo-img" src="data:image/png;base64,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" alt="UPTOWN"/>
//   ${branchNameAr ? `<div class="branch-name">فرع ${branchNameAr}</div>` : ""}
//   ${branchPhone ? `<div class="branch-phone">${branchPhone}</div>` : ""}

//   <table>
//     ${dividerSolid()}

//     <!-- ══ معلومات الطلب ══ -->
//     ${row("رقم الطلب", `<strong>#${order.id}</strong>`)}
//     ${row("التاريخ", date)}
//     ${row("النوع", `<span class="badge">${typeLabel}</span>`)}

//     ${dividerDash()}

//     <!-- ══ بيانات الزبون ══ -->
//     ${row("الزبون", `<strong>${order.customerName}</strong>`)}
//     ${row("الهاتف", order.customerPhone)}
//     ${locationRow}

//     ${dividerDash()}

//     <!-- ══ الأصناف ══ -->
//     <tr class="items-header">
//       <td>الصنف</td>
//       <td style="text-align:center;">الكمية</td>
//       <td style="text-align:left;">السعر</td>
//     </tr>
//     ${itemsRows}

//     ${dividerSolid()}

//     <!-- ══ الأسعار والخصومات ══ -->
//     ${row("المجموع الجزئي", `${subtotal.toFixed(2)} ILS`)}
//     ${invoiceDiscountRow}
//     ${deliveryRow}

//     ${dividerDash()}

//     <!-- ══ المجموع النهائي ══ -->
//     <tr class="total-row">
//       <td style="font-size:13pt; font-weight:900;">المجموع النهائي</td>
//       <td colspan="2" style="text-align:left; font-size:15pt; font-weight:900;">${Math.round(order.totalAmount)} ILS</td>
//     </tr>
//     ${row("طريقة الدفع", payLabel)}
//     ${order.notes ? `
//     <tr>
//       <td colspan="3" style="padding:4px 0 2px; font-size:9pt; font-weight:700; border-top:1px dashed #000;">ملاحظة:</td>
//     </tr>
//     <tr>
//       <td colspan="3" style="padding:0 0 4px; font-size:9.5pt;">${order.notes}</td>
//     </tr>` : ""}

//     ${dividerDash()}
//   </table>

//   <!-- ══ FOOTER ══ -->
//   <div class="footer">شكراً لزيارتكم</div>

// </body>
// </html>`;
// }

// // ─── Silent iFrame Printer ────────────────────────────────────────────────────
// function printViaSilentIframe(order: PrintOrder): Promise<void> {
//   return new Promise((resolve) => {
//     document.getElementById("__receipt_frame")?.remove();

//     const iframe = document.createElement("iframe");
//     iframe.id = "__receipt_frame";
//     iframe.style.cssText =
//       "position:fixed;top:0;left:0;width:300px;height:600px;border:0;opacity:0;z-index:-1;";
//     document.body.appendChild(iframe);

//     const html = buildReceiptHTML(order);

//     iframe.onload = () => {
//       try {
//         iframe.contentWindow?.focus();
//         iframe.contentWindow?.print();
//       } catch (e) {
//         const win = window.open("", "_blank", "width=1,height=1");
//         if (win) {
//           win.document.write(html);
//           win.document.close();
//           win.onload = () => {
//             win.print();
//             win.onafterprint = () => win.close();
//           };
//         } else {
//           alert("يرجى السماح بالنوافذ المنبثقة لهذا الموقع");
//         }
//       }
//       resolve();
//     };

//     const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
//     if (doc) {
//       doc.open();
//       doc.write(html);
//       doc.close();
//     } else {
//       resolve();
//     }
//   });
// }

// // ─── Component ────────────────────────────────────────────────────────────────
// export function PrintReceiptButton({ order }: Props) {
//   const printing = useRef(false);

//   const handlePrint = useCallback(async () => {




//     const html = buildReceiptHTML(order);

//     const win = window.open("", "_blank");
//     if (win) {
//       win.document.write(html);
//       win.document.close();
//     }






//     if (printing.current) return;
//     printing.current = true;
//     try {
//       let fullOrder = order as PrintOrder;

//       // لو الأصناف مش موجودة، نجيبها من الـ API
//       if (!order.items || order.items.length === 0) {
//         console.log("[PrintReceipt] items not in order object, fetching from API...", { orderId: order.id, items: order.items });
//         try {
//           const res = await fetch(`/api/admin/orders/${order.id}`);
//           console.log("[PrintReceipt] API response status:", res.status);
//           if (res.ok) {
//             const data = await res.json();
//             console.log("[PrintReceipt] Raw API data:", JSON.stringify(data).slice(0, 500));
//             const o = data.order ?? data;
//             console.log("[PrintReceipt] order_items from API:", o.order_items);
//             fullOrder = {
//               ...order,
//               notes: o.notes ?? order.notes ?? null,
//               // أصناف الطلب — تحويل snake_case
//               items: o.order_items?.map((item: any) => ({
//                 id: item.id,
//                 orderId: item.order_id,
//                 productId: item.product_id,
//                 productNameAr: item.product_name_ar ?? "",
//                 productNameEn: item.product_name_en ?? "",
//                 quantity: item.quantity,
//                 price: Number(item.price),
//                 originalPrice: item.original_price ? Number(item.original_price) : null,
//                 addonDetails: item.addon_details ?? null,
//               })) ?? [],
//               // بيانات الفرع من الـ API
//               branch: o.branch ? {
//                 nameAr: o.branch.name_ar ?? order.branch?.nameAr ?? "",
//                 nameEn: o.branch.name_en ?? order.branch?.nameEn ?? "",
//                 phone: o.branch.phone ?? order.branch?.phone ?? "",
//                 whatsApp: o.branch.whatsapp ?? order.branch?.whatsApp ?? "",
//               } : order.branch,
//             };
//             console.log("[PrintReceipt] fullOrder.items after mapping:", fullOrder.items);
//           }
//         } catch (e) {
//           console.warn("[PrintReceipt] Failed to fetch order items", e);
//         }
//       } else {
//         console.log("[PrintReceipt] items already in order object:", order.items);
//       }

//       await printViaSilentIframe(fullOrder);
//     } finally {
//       printing.current = false;
//     }
//   }, [order]);

//   return (
//     <button
//       onClick={handlePrint}
//       title="طباعة الفاتورة"
//       style={{
//         width: "32px",
//         height: "32px",
//         borderRadius: "8px",
//         border: "none",
//         background: "#f0fdf4",
//         color: "#15803d",
//         cursor: "pointer",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "right",
//       }}
//     >
//       <Printer size={14} />
//     </button>
//   );
// }



























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
  originalPrice: number | null;
  addonDetails: string | null;
}

interface PrintOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  orderType: "Delivery" | "Table" | "Pickup";
  address: string | null;
  tableNumber: string | null;

  // الأسعار
  subtotal?: number;                                        // مجموع الأصناف قبل الخصم
  totalAmount: number;                                      // المجموع النهائي
  deliveryFee?: number | null;                              // رسوم التوصيل بعد الخصم
  originalDeliveryFee?: number | null;                      // رسوم التوصيل الأصلية قبل الخصم

  // خصم الفاتورة (على الأصناف)
  invoiceDiscountAmount?: number | null;
  invoiceDiscountType?: "fixed" | "percentage" | null;

  // خصم التوصيل
  deliveryDiscountAmount?: number | null;
  deliveryDiscountType?: string | null;

  paymentMethod: "Cash" | "Card" | "palpay";
  createdAt: string;

  // الفرع — كامل من الـ Branch type
  branch?: {
    nameAr?: string;
    nameEn?: string;
    phone?: string;
    whatsApp?: string;
  } | null;

  items?: OrderItem[] | null;
  notes?: string | null;
}

interface Props {
  order: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function row(label: string, value: string): string {
  return `<tr>
    <td class="lbl">${label}</td>
    <td colspan="2" class="val">${value}</td>
  </tr>`;
}

function dividerSolid(): string {
  return `<tr><td colspan="3" style="padding:4px 0;">
    <div style="border-top:1.5px solid #000;"></div>
  </td></tr>`;
}

function dividerDash(): string {
  return `<tr><td colspan="3" style="padding:4px 0;">
    <div style="border-top:1px dashed #000;"></div>
  </td></tr>`;
}

// ─── HTML Receipt Builder ─────────────────────────────────────────────────────
function buildReceiptHTML(order: PrintOrder): string {
  const date = new Date(order.createdAt).toLocaleString("ar-EG");

  const typeLabel =
    order.orderType === "Delivery" ? "توصيل" :
      order.orderType === "Pickup" ? "استلام" : "طاولة";

  const payLabel =
    order.paymentMethod === "Cash" ? "نقدي" :
      order.paymentMethod === "palpay" ? "إلكتروني (Visa)" : "بطاقة / إلكتروني";

  const branchNameAr = order.branch?.nameAr || "";
  const branchPhone = order.branch?.phone || order.branch?.whatsApp || "";

  const items = order.items ?? [];

  // ── حساب الأرقام ─────────────────────────────────────────────────────────
  const subtotal = order.subtotal ?? order.totalAmount;
  const invoiceDiscount = order.invoiceDiscountAmount ?? 0;
  const invoiceDiscountType = order.invoiceDiscountType ?? "fixed";
  const deliveryOriginal = order.originalDeliveryFee ?? order.deliveryFee ?? 0;
  const deliveryDiscount = order.deliveryDiscountAmount ?? 0;
  const deliveryFinal = order.deliveryFee ?? 0;
  const isDelivery = order.orderType === "Delivery";

  // ── helper: تحويل addon_details لصفوف HTML للطابعة الحرارية ──────────────
  function renderAddons(addonDetails: string | null): string {
    if (!addonDetails) return "";
    try {
      const parsed = JSON.parse(addonDetails);
      if (parsed?.type === "family_meal" && Array.isArray(parsed.burgers)) {
        const burgerRows = parsed.burgers.map((burger: any) => {
          const typeName = burger.typeAr || burger.typeEn || "";
          const addonsText = burger.addons?.length
            ? burger.addons.map((a: any) => a.nameAr || a.nameEn).join("، ")
            : "";
          const withoutText = burger.without?.length
            ? "بدون: " + burger.without.map((w: any) => w.nameAr || w.nameEn).join("، ")
            : "";
          let burgerLine = `بيرجر ${burger.index}`;
          if (typeName) burgerLine += `: ${typeName}`;
          return `
            <tr><td colspan="3" style="font-size:9pt; padding:2px 0 0 12px; font-weight:700;">— ${burgerLine}</td></tr>
            ${addonsText ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 20px;">+ ${addonsText}</td></tr>` : ""}
            ${withoutText ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 20px;">* ${withoutText}</td></tr>` : ""}
          `;
        }).join("");
        const noteRow = parsed.note
          ? `<tr><td colspan="3" style="font-size:8.5pt; padding:1px 0 0 12px;">* ${parsed.note}</td></tr>`
          : "";
        return burgerRows + noteRow;
      }
    } catch (_) { }
    // fallback — نص عادي مفصول بـ |
    return addonDetails.split(" | ")
      .map((p: string) => `<tr><td colspan="3" style="font-size:9pt; padding:1px 0 1px 12px;">— ${p.trim()}</td></tr>`)
      .join("");
  }

  // ── أصناف الطلب ──────────────────────────────────────────────────────────
  const itemsRows = items.map((item: OrderItem) => {
    const lineTotal = (item.price * item.quantity).toFixed(2);
    const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price);
    const originalLineTotal = hasDiscount ? (Number(item.originalPrice) * item.quantity).toFixed(2) : null;
    const discountPct = hasDiscount ? Math.round((1 - Number(item.price) / Number(item.originalPrice!)) * 100) : 0;
    const addons = renderAddons(item.addonDetails);
    return `
      <tr>
        <td style="font-weight:700; padding:3px 0; font-size:10.5pt;">${item.productNameAr}</td>
        <td style="text-align:center; padding:3px 4px; font-size:10pt; white-space:nowrap;">x${item.quantity}</td>
        <td style="text-align:left; padding:3px 0; white-space:nowrap; font-size:10pt;">
          ${hasDiscount ? `<span style="text-decoration:line-through; font-weight:400; font-size:9pt;">${originalLineTotal}</span><br>` : ""}
          <span style="font-weight:700;">${lineTotal}</span>
          ${hasDiscount ? `<br><span style="font-size:8.5pt; font-weight:700;">خصم ${discountPct}%</span>` : ""}
        </td>
      </tr>
      ${addons}
    `;
  }).join("");

  // ── صف العنوان/الطاولة ────────────────────────────────────────────────────
  const locationRow =
    order.orderType === "Delivery" && order.address
      ? row("العنوان", order.address)
      : order.tableNumber
        ? row("طاولة رقم", order.tableNumber)
        : "";

  // ── صفوف الأسعار والخصومات ────────────────────────────────────────────────

  // خصم الفاتورة — يظهر فقط لو موجود
  const invoiceDiscountLabel = invoiceDiscountType === "percentage"
    ? `خصم الفاتورة (${order.invoiceDiscountAmount && subtotal ? Math.round((order.invoiceDiscountAmount / subtotal) * 100) : ""}%)`
    : "خصم الفاتورة";

  const invoiceDiscountRow = invoiceDiscount > 0 ? `
    <tr>
      <td style="padding:2px 0; font-size:10pt;">${invoiceDiscountLabel}</td>
      <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700; color:#000;">- ${invoiceDiscount.toFixed(2)}</td>
    </tr>` : "";

  // رسوم التوصيل — تظهر فقط لو delivery
  const deliveryRow = isDelivery ? (() => {
    if (deliveryFinal <= 0) {
      // مجاني — مع توضيح لو كانت هناك خصم
      return `<tr>
        <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
        <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700;">
          ${deliveryOriginal > 0 && deliveryDiscount > 0
          ? `<span style="text-decoration:line-through; font-weight:400; margin-left:4px;">${deliveryOriginal.toFixed(2)}</span> `
          : ""}
          مجاني
        </td>
      </tr>`;
    }
    if (deliveryDiscount > 0) {
      // في خصم على التوصيل
      const pct = deliveryOriginal > 0 ? Math.round((deliveryDiscount / deliveryOriginal) * 100) : 0;
      return `
        <tr>
          <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
          <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt;">
            <span style="text-decoration:line-through; font-weight:400; margin-left:4px;">${deliveryOriginal.toFixed(2)}</span>
            <strong>${deliveryFinal.toFixed(2)}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:2px 0; font-size:10pt;">خصم التوصيل${pct > 0 ? ` (${pct}%)` : ""}</td>
          <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700; color:#000;">- ${deliveryDiscount.toFixed(2)}</td>
        </tr>`;
    }
    // تسليم عادي بدون خصم
    return `<tr>
      <td style="padding:2px 0; font-size:10pt;">رسوم التوصيل</td>
      <td colspan="2" style="text-align:left; padding:2px 0; font-size:10pt; font-weight:700;">${deliveryFinal.toFixed(2)}</td>
    </tr>`;
  })() : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة #${order.id}</title>
<style>
  * {
    margin: 0; padding: 0; box-sizing: border-box;
    font-family: 'Tahoma', 'Arial', sans-serif;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    width: 72mm;
    margin: 0;
    padding: 3mm 2mm;
    direction: rtl;
    font-size: 11pt;
    background: #fff;
  }
  table { width: 100%; border-collapse: collapse; }
  .logo-img {
    display: block;
    margin: 0 auto 3px;
    width: 52mm;
    max-width: 100%;
  }
  .branch-name {
    text-align: center;
    font-size: 10.5pt;
    font-weight: 700;
    margin-bottom: 1px;
  }
  .branch-phone {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 3px;
  }
  .section-title {
    font-size: 9.5pt;
    font-weight: 700;
    margin-bottom: 2px;
    border-bottom: 1px solid #000;
    padding-bottom: 2px;
  }
  .badge {
    display: inline-block;
    border: 1.5px solid #000;
    padding: 0 5px;
    font-weight: 700;
    font-size: 10pt;
  }
  td.lbl {
    text-align: right;
    padding: 2px 0;
    font-size: 10.5pt;
    white-space: nowrap;
    width: 40%;
  }
  td.val {
    text-align: left;
    padding: 2px 0 2px 4px;
    font-size: 10.5pt;
  }
  .items-header td {
    font-weight: 700;
    font-size: 10pt;
    border-bottom: 1px solid #000;
    padding-bottom: 3px;
  }
  .total-row td {
    padding-top: 4px;
  }
  .footer {
    text-align: center;
    font-size: 12pt;
    font-weight: 900;
    margin-top: 5px;
  }


  @page {
    size: 80mm portrait; 
    margin: 0;
  }

@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html, body {
    width: 72mm; /* عرض المحتوى لترك هوامش أمان */
    margin: 0 auto;
    padding: 2mm;
    direction: rtl;
  }
  header, footer, .no-print { display: none !important; }
}


</style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <img class="logo-img" src="data:image/png;base64,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" alt="UPTOWN"/>
  ${branchNameAr ? `<div class="branch-name">فرع ${branchNameAr}</div>` : ""}
  ${branchPhone ? `<div class="branch-phone">${branchPhone}</div>` : ""}

  <table>
    ${dividerSolid()}

    <!-- ══ معلومات الطلب ══ -->
    ${row("رقم الطلب", `<strong>#${order.id}</strong>`)}
    ${row("التاريخ", date)}
    ${row("النوع", `<span class="badge">${typeLabel}</span>`)}

    ${dividerDash()}

    <!-- ══ بيانات الزبون ══ -->
    ${row("الزبون", `<strong>${order.customerName}</strong>`)}
    ${row("الهاتف", order.customerPhone)}
    ${locationRow}

    ${dividerDash()}

    <!-- ══ الأصناف ══ -->
    <tr class="items-header">
      <td>الصنف</td>
      <td style="text-align:center;">الكمية</td>
      <td style="text-align:left;">السعر</td>
    </tr>
    ${itemsRows}

    ${dividerSolid()}

    <!-- ══ الأسعار والخصومات ══ -->
    ${row("المجموع الجزئي", `${subtotal.toFixed(2)} ILS`)}
    ${invoiceDiscountRow}
    ${deliveryRow}

    ${dividerDash()}

    <!-- ══ المجموع النهائي ══ -->
    <tr class="total-row">
      <td style="font-size:13pt; font-weight:900;">المجموع النهائي</td>
      <td colspan="2" style="text-align:left; font-size:15pt; font-weight:900;">${Math.round(order.totalAmount)} ILS</td>
    </tr>
    ${row("طريقة الدفع", payLabel)}
    ${order.notes ? `
    <tr>
      <td colspan="3" style="padding:4px 0 2px; font-size:9pt; font-weight:700; border-top:1px dashed #000;">ملاحظة:</td>
    </tr>
    <tr>
      <td colspan="3" style="padding:0 0 4px; font-size:9.5pt;">${order.notes}</td>
    </tr>` : ""}

    ${dividerDash()}
  </table>

  <!-- ══ FOOTER ══ -->
  <div class="footer">شكراً لزيارتكم</div>

</body>
</html>`;
}

// ─── Silent iFrame Printer ────────────────────────────────────────────────────
function printViaSilentIframe(order: PrintOrder): Promise<void> {
  return new Promise((resolve) => {
    document.getElementById("__receipt_frame")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__receipt_frame";
    // iframe.style.cssText =
    //   "position:fixed;top:0;left:0;width:80mm;height:90vh;border:2px solid red;opacity:1;z-index:9999;";
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:80mm;height:297mm;border:none;visibility:hidden;";

    document.body.appendChild(iframe);

    const html = buildReceiptHTML(order);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
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
    };

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




    // const html = buildReceiptHTML(order);

    // const win = window.open("", "_blank");
    // if (win) {
    //   win.document.write(html);
    //   win.document.close();
    // }






    if (printing.current) return;
    printing.current = true;
    try {
      let fullOrder = order as PrintOrder;

      // لو الأصناف مش موجودة، نجيبها من الـ API
      if (!order.items || order.items.length === 0) {
        console.log("[PrintReceipt] items not in order object, fetching from API...", { orderId: order.id, items: order.items });
        try {
          const res = await fetch(`/api/admin/orders/${order.id}`);
          console.log("[PrintReceipt] API response status:", res.status);
          if (res.ok) {
            const data = await res.json();
            console.log("[PrintReceipt] Raw API data:", JSON.stringify(data).slice(0, 500));
            const o = data.order ?? data;
            console.log("[PrintReceipt] order_items from API:", o.order_items);
            fullOrder = {
              ...order,
              notes: o.notes ?? order.notes ?? null,
              // أصناف الطلب — تحويل snake_case
              items: o.order_items?.map((item: any) => ({
                id: item.id,
                orderId: item.order_id,
                productId: item.product_id,
                productNameAr: item.product_name_ar ?? "",
                productNameEn: item.product_name_en ?? "",
                quantity: item.quantity,
                price: Number(item.price),
                originalPrice: item.original_price ? Number(item.original_price) : null,
                addonDetails: item.addon_details ?? null,
              })) ?? [],
              // بيانات الفرع من الـ API
              branch: o.branch ? {
                nameAr: o.branch.name_ar ?? order.branch?.nameAr ?? "",
                nameEn: o.branch.name_en ?? order.branch?.nameEn ?? "",
                phone: o.branch.phone ?? order.branch?.phone ?? "",
                whatsApp: o.branch.whatsapp ?? order.branch?.whatsApp ?? "",
              } : order.branch,
            };
            console.log("[PrintReceipt] fullOrder.items after mapping:", fullOrder.items);
          }
        } catch (e) {
          console.warn("[PrintReceipt] Failed to fetch order items", e);
        }
      } else {
        console.log("[PrintReceipt] items already in order object:", order.items);
      }

      await printViaSilentIframe(fullOrder);
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
        justifyContent: "right",
      }}
    >
      <Printer size={14} />
    </button>
  );
}