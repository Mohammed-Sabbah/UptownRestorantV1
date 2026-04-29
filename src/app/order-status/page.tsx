"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const STATUS_STEPS = [
  { key: "Pending", arLabel: "استلام الطلب", enLabel: "Order Received", icon: "📥" },
  { key: "Confirmed", arLabel: "تأكيد الطلب", enLabel: "Order Confirmed", icon: "✅" },
  { key: "Preparing", arLabel: "قيد التحضير", enLabel: "Preparing", icon: "👨‍🍳" },
  { key: "Ready", arLabel: "جاهز للاستلام", enLabel: "Ready for Pickup", icon: "🎉" },
  { key: "Out for Delivery", arLabel: "في الطريق إليك", enLabel: "Out for Delivery", icon: "🛵" },
  { key: "Delivered", arLabel: "تم التسليم", enLabel: "Delivered", icon: "🏠" },
];

const TERMINAL_STATUSES = ["Delivered", "Cancelled"];
const ESTIMATE_MINUTES: Record<string, number> = {
  Pending: 35,
  Confirmed: 30,
  Preparing: 20,
  Ready: 5,
  "Out for Delivery": 10,
  Delivered: 0,
};

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isAr = typeof document !== "undefined"
    ? !document.cookie.includes("language=en")
    : true;

  const fetchStatus = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/order-status?orderId=${orderId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setLastUpdated(new Date());
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (order && !TERMINAL_STATUSES.includes(order.status)) {
        fetchStatus();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId, order?.status]);

  if (!orderId) {
    return (
      <div style={style.center}>
        <p style={{ color: "#888" }}>{isAr ? "رقم الطلب غير موجود" : "No order ID provided"}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={style.center}>
        <div style={style.spinner} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={style.center}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
        <p style={{ color: "#888", fontWeight: 700 }}>
          {isAr ? "لم يتم العثور على الطلب" : "Order not found"}
        </p>
        <a href="/" style={{ color: "#8b0000", fontWeight: 800, marginTop: "20px", display: "block" }}>
          {isAr ? "← الرجوع للرئيسية" : "← Back to Home"}
        </a>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "Cancelled";

  console.log("order.status:", JSON.stringify(order.status)); ///////////////////////////////////////////////////////////////////////////////

  const estimateMins = ESTIMATE_MINUTES[order.status] ?? 30;

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F6", padding: "24px", direction: isAr ? "rtl" : "ltr" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(139,0,0,0.4); }
          70% { box-shadow: 0 0 0 16px rgba(139,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(139,0,0,0); }
        }
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .status-card { animation: fade-up 0.4s ease both; }
        .step-active { animation: pulse-ring 2s infinite; }
      ` }} />

      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "30px 0 20px" }}>
          <img src="/logo.jpeg" alt="Uptown" style={{ height: "50px", marginBottom: "12px" }} />
          <h1 style={{ fontWeight: 900, fontSize: "1.8rem", margin: 0 }}>
            {isAr ? "متابعة الطلب" : "Track Your Order"}
          </h1>
          <p style={{ color: "#888", fontWeight: 700, fontSize: "14px", marginTop: "6px" }}>
            #{orderId} — {order.customer_name}
          </p>
        </div>

        {/* Status Card */}
        <div className="status-card" style={{
          background: "#fff",
          borderRadius: "32px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
          border: "1px solid #ECEAE7",
          marginBottom: "20px",
        }}>
          {/* Current Status Banner */}
          {/* Current Status Banner */}
          <div style={{
            background: isCancelled ? "#FEE2E2" : order.status === "Pending" ? "#FFF8E1" : "#FFF4F4",
            borderRadius: "20px",
            padding: "20px 24px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: isCancelled ? "#DC2626" : order.status === "Pending" ? "#F59E0B" : "#8B0000",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px", flexShrink: 0,
            }} className={!isCancelled && !TERMINAL_STATUSES.includes(order.status) ? "step-active" : ""}>
              {isCancelled ? "❌" : order.status === "Pending" ? "⏳" : (STATUS_STEPS[currentStatusIndex]?.icon ?? "🔄")}
            </div>
            <div>
              {order.status === "Pending" ? (
                <>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#D97706" }}>
                    {isAr ? "طلبك قيد الانتظار" : "Your order is pending"}
                  </div>
                  <div style={{ color: "#92400E", fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>
                    {isAr ? "بانتظار تأكيد المطعم..." : "Waiting for restaurant confirmation..."}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: isCancelled ? "#DC2626" : "#8B0000" }}>
                    {isCancelled
                      ? (isAr ? "تم إلغاء الطلب" : "Order Cancelled")
                      : (isAr ? STATUS_STEPS[currentStatusIndex]?.arLabel : STATUS_STEPS[currentStatusIndex]?.enLabel)}
                  </div>
                  {order.estimated_time ? (
                    <div style={{ color: "#059669", fontWeight: 800, fontSize: "14px", marginTop: "4px" }}>
                      ⏱ {isAr ? "الوقت المقدر:" : "Estimated time:"} {order.estimated_time}
                    </div>
                  ) : (
                    !isCancelled && order.status !== "Delivered" && (
                      <div style={{ color: "#555", fontWeight: 700, fontSize: "13px", marginTop: "4px" }}>
                        ⏱ {isAr ? `الوقت المتبقي المتوقع: ~${estimateMins} دقيقة` : `Estimated time: ~${estimateMins} min`}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {STATUS_STEPS.filter(s => !["Out for Delivery"].includes(s.key) || order.order_type === "Delivery").map((step, idx) => {
                const isCompleted = currentStatusIndex > idx;
                const isCurrent = currentStatusIndex === idx;
                return (
                  <div key={step.key} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    {/* Track line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: isCompleted ? "#8B0000" : isCurrent ? "#8B0000" : "#E5E7EB",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", transition: "all 0.3s",
                        color: isCompleted || isCurrent ? "#fff" : "#9CA3AF",
                      }}>
                        {isCompleted ? "✓" : step.icon}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div style={{
                          width: "2px", height: "36px",
                          background: isCompleted ? "#8B0000" : "#E5E7EB",
                          transition: "background 0.3s",
                        }} />
                      )}
                    </div>
                    {/* Label */}
                    <div style={{ paddingTop: "4px", paddingBottom: "28px" }}>
                      <div style={{
                        fontWeight: isCurrent ? 900 : isCompleted ? 700 : 600,
                        color: isCurrent ? "#8B0000" : isCompleted ? "#111" : "#9CA3AF",
                        fontSize: isCurrent ? "16px" : "14px",
                      }}>
                        {isAr ? step.arLabel : step.enLabel}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                          {isAr ? "الحالة الحالية" : "Current status"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Info */}
        <div style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "24px",
          border: "1px solid #ECEAE7",
          marginBottom: "20px",
          fontSize: "14px",
        }}>
          <h3 style={{ margin: "0 0 16px", fontWeight: 900 }}>{isAr ? "تفاصيل الطلب" : "Order Details"}</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: "#888" }}>{isAr ? "رقم الطلب" : "Order ID"}</span>
            <span style={{ fontWeight: 800 }}>#{order.id}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: "#888" }}>{isAr ? "نوع الطلب" : "Order Type"}</span>
            <span style={{ fontWeight: 800 }}>{order.order_type === 'Delivery' ? (isAr ? 'توصيل' : 'Delivery') : (isAr ? 'استلام من الفرع' : 'Branch Pickup')}</span>
          </div>
          {order.table_number && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ color: "#888" }}>{isAr ? "وقت التجهيز" : "Prep Time"}</span>
              <span style={{ fontWeight: 800 }}>{order.table_number}</span>
            </div>
          )}
          {order.scheduled_at && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "100px", background: '#FFFBEB', padding: '10px', borderRadius: '12px', border: '1px solid #FCD34D' }}>
              <span style={{ color: "#92400E", fontWeight: 700 }}>{isAr ? "موعد الجدولة" : "Scheduled For"}</span>
              <span style={{ fontWeight: 900, color: '#92400E' }}>{order.scheduled_at}</span>
            </div>
          )}
          <div style={{ marginTop: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
            <h4 style={{ fontWeight: 900, marginBottom: '12px', fontSize: '13px', color: '#666' }}>{isAr ? 'الأصناف' : 'Items'}</h4>
            {order.order_items?.map((item: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, alignItems: 'flex-start' }}>
                  <span>{item.quantity}x {isAr ? item.product_name_ar : item.product_name_en}</span>
                  <div style={{ textAlign: 'end', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {item.original_price && Number(item.original_price) > Number(item.price) && (
                      <>
                        <span style={{ textDecoration: 'line-through', opacity: 0.45, fontSize: '11px', fontWeight: 500 }}>
                          {(Number(item.original_price) * item.quantity).toFixed(2)} ₪
                        </span>
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', alignSelf: 'flex-end' }}>
                          {Math.round((1 - Number(item.price) / Number(item.original_price)) * 100)}% OFF
                        </span>
                      </>
                    )}
                    <span style={{ color: item.original_price && Number(item.original_price) > Number(item.price) ? '#8B0000' : '#000' }}>
                      {(Number(item.price) * item.quantity).toFixed(2)} ₪
                    </span>
                  </div>
                </div>
                {item.addon_details && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', paddingRight: isAr ? '10px' : '0', paddingLeft: isAr ? '0' : '10px', borderRight: isAr ? '2px solid #eee' : 'none', borderLeft: isAr ? 'none' : '2px solid #eee' }}>
                    {(() => {
                      let familyData: any = null;
                      try {
                        const parsed = JSON.parse(item.addon_details);
                        if (parsed?.type === 'family_meal') familyData = parsed;
                      } catch (_) { }

                      if (familyData) {
                        return (
                          <div>
                            {familyData.burgers.map((burger: any, bIdx: number) => (
                              <div key={bIdx} style={{
                                borderBottom: bIdx < familyData.burgers.length - 1 ? '1px dashed #eee' : 'none',
                                paddingBottom: '8px', marginBottom: '8px'
                              }}>
                                <div>
                                  <span style={{ fontWeight: 900, color: '#8B0000' }}>
                                    🍔 {isAr ? `بيرجر ${burger.index}` : `Burger ${burger.index}`}:
                                  </span>
                                  {(isAr ? burger.typeAr : burger.typeEn) && (
                                    <span style={{ fontWeight: 700, color: '#333', marginRight: '6px', marginLeft: '6px' }}>
                                      {isAr ? burger.typeAr : burger.typeEn}
                                    </span>
                                  )}
                                </div>
                                {burger.addons?.length > 0 && (
                                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {burger.addons.map((addon: any, aIdx: number) => (
                                      <span key={aIdx} style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                                        ➕ {isAr ? addon.nameAr : addon.nameEn}{addon.price > 0 ? ` (+${addon.price}₪)` : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {burger.without?.length > 0 && (
                                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {burger.without.map((w: any, wIdx: number) => (
                                      <span key={wIdx} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                                        🚫 {isAr ? w.nameAr : w.nameEn}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {familyData.note && (
                              <div style={{ color: '#888', fontStyle: 'italic', fontSize: '11px', marginTop: '4px' }}>📝 {familyData.note}</div>
                            )}
                          </div>
                        );
                      }

                      return item.addon_details.split('|').map((part: string, pIdx: number) => {
                        const isExclusion = part.includes('بدون') || part.toLowerCase().includes('without');
                        return (
                          <div key={pIdx} style={{ color: isExclusion ? '#dc2626' : '#666', fontWeight: isExclusion ? 700 : 500 }}>
                            {isExclusion ? '🚫 ' : '• '}{part.trim()}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0f0", paddingTop: "12px", marginTop: '12px', flexDirection: 'column', gap: '8px' }}>
            {/* خصم الفاتورة */}
            {Number(order.invoice_discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                <span>
                  🎁 {isAr ? 'خصم الفاتورة' : 'Invoice Discount'}
                  {order.invoice_discount_type === 'percentage'
                    ? ` (${Math.round((Number(order.invoice_discount_amount) / ((Number(order.invoice_discount_amount) + (order.order_items || []).reduce((a: number, i: any) => a + (i.price * i.quantity), 0)) || 1)) * 100)}%)`
                    : ` (${Number(order.invoice_discount_amount).toFixed(2)} ₪)`}
                </span>
                <span>-{Number(order.invoice_discount_amount).toFixed(2)} ₪</span>
              </div>
            )}
            {/* خصم التوصيل */}
            {order.order_type === 'Delivery' && Number(order.delivery_discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                <span>
                  🚚 {isAr ? 'خصم التوصيل' : 'Delivery Discount'}
                  {order.delivery_discount_type === 'percentage' && ` (${Math.round((Number(order.delivery_discount_amount) / ((Number(order.delivery_fee) + Number(order.delivery_discount_amount)) || 1)) * 100)}%)`}
                  {order.delivery_discount_type === 'fixed' && ` (${Number(order.delivery_discount_amount).toFixed(2)} ₪)`}
                  {order.delivery_discount_type === 'free' && ` (${isAr ? 'مجاني' : 'Free'})`}
                </span>
                <span>-{Number(order.delivery_discount_amount).toFixed(2)} ₪</span>
              </div>
            )}
            {/* رسوم التوصيل */}
            {order.order_type === 'Delivery' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: Number(order.delivery_fee) > 0 ? '#666' : '#059669', fontWeight: 700 }}>
                <span>{isAr ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                <span>{Number(order.delivery_fee) > 0 ? `+${Number(order.delivery_fee).toFixed(2)} ₪` : (isAr ? '🎉 مجاني' : '🎉 Free')}</span>
              </div>
            )}
            {/* الإجمالي */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ fontWeight: 900 }}>{isAr ? "الإجمالي" : "Total"}</span>
              <span style={{ fontWeight: 900, color: "#8B0000", fontSize: "1.2rem" }}>
                {Number(order.total_amount).toFixed(2)} ₪
              </span>
            </div>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {!TERMINAL_STATUSES.includes(order.status) && (
          <p style={{ textAlign: "center", fontSize: "12px", color: "#bbb", fontWeight: 600 }}>
            🔄 {isAr
              ? `يتم تحديث الحالة تلقائياً كل 10 ثوانٍ${lastUpdated ? ` • آخر تحديث: ${lastUpdated.toLocaleTimeString("ar-PS")}` : ""}`
              : `Auto-refreshing every 10s${lastUpdated ? ` • Last update: ${lastUpdated.toLocaleTimeString()}` : ""}`}
          </p>
        )}

        <a href="/" style={{
          display: "block", textAlign: "center", color: "#888",
          fontWeight: 700, textDecoration: "none", fontSize: "13px", marginTop: "16px"
        }}>
          {isAr ? "← العودة للرئيسية" : "← Back to Home"}
        </a>
      </div>
    </div>
  );
}

const style = {
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", background: "#FAF9F6",
  },
  spinner: {
    width: "48px", height: "48px",
    border: "5px solid #000", borderBottomColor: "transparent",
    borderRadius: "50%", animation: "rotation 1s linear infinite",
  },
};

export default function OrderStatusPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 48, height: 48, border: "5px solid #000", borderBottomColor: "transparent", borderRadius: "50%" }} />
      </div>
    }>
      <OrderStatusContent />
    </Suspense>
  );
}