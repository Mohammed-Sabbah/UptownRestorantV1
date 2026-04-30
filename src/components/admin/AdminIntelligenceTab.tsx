"use client";

import { type Order, type Branch } from "@/lib/types";
import { useState, useMemo, useEffect, useCallback } from "react";
import { updateOrderStatus, getOrderSummary } from "@/lib/order-actions";
import { Search, Filter, Calendar, CreditCard, LayoutGrid, RefreshCw, X } from "lucide-react";
import { FamilyMealDetails, parseFamilyMeal } from "@/lib/Familymealutils";
import { PrintReceiptButton } from "../PrintReceiptButton";

type Props = {
  orders?: Order[]; // optional — now fetched internally
  branches: Branch[];
  role?: string;
};

export function AdminIntelligenceTab({ orders: initialOrders = [], branches, role }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusModal, setStatusModal] = useState<{ orderId: any, currentStatus: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ orderId: any, newStatus: string } | null>(null);
  const [estimatedTime, setEstimatedTime] = useState("");

  const isCashier = role?.toLowerCase() === "cashier";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("Today");


  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      // map snake_case from DB to camelCase Order type
      const mapped: Order[] = (data.orders || []).map((o: any) => {
        const deliveryFee = Number(o.delivery_fee ?? 0);
        const invoiceDiscount = Number(o.invoice_discount_amount ?? 0);
        const deliveryDiscount = Number(o.delivery_discount_amount ?? 0);
        const totalAmount = Number(o.total_amount ?? 0);

        // subtotal = total + invoiceDiscount - deliveryFee
        const subtotal = totalAmount + invoiceDiscount - deliveryFee;
        // originalDeliveryFee = رسوم التوصيل قبل الخصم
        const originalDeliveryFee = deliveryFee + deliveryDiscount;

        return {
          id: o.id,
          branchId: o.branch_id,
          customerId: o.customer_id,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          customerEmail: o.customer_email || "",
          orderType: o.order_type,
          address: o.address,
          tableNumber: o.table_number,
          totalAmount,
          status: o.status,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          createdAt: o.created_at,
          notes: o.notes || null,

          // ── أسعار وخصومات ─────────────────────────────────────
          subtotal,
          deliveryFee,
          originalDeliveryFee,
          invoiceDiscountAmount: invoiceDiscount,
          invoiceDiscountType: o.invoice_discount_type ?? null,
          deliveryDiscountAmount: deliveryDiscount,
          deliveryDiscountType: o.delivery_discount_type ?? null,

          // ── بيانات الفرع كاملة ──────────────────────────────
          // الـ API الرئيسي بيرجع 'branches' (جمع)، والـ single order بيرجع 'branch'
          branch: (() => {
            const b = o.branch ?? o.branches;
            if (!b) return undefined;
            return {
              ...b,
              nameAr: b.name_ar ?? b.nameAr ?? "",
              nameEn: b.name_en ?? b.nameEn ?? "",
              phone: b.phone ?? "",
              whatsApp: b.whats_app ?? b.whatsApp ?? "",
            };
          })(),

          // ── أصناف الطلب — تحويل snake_case ────────────────────
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
        };
      });

      setOrders(mapped);
      setLastUpdated(new Date());
    } catch (e) {
      // silent fail — keep showing previous data
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  // auto-refresh every 6 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 6000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // after status update — refresh immediately instead of window.location.reload()
  const handleStatusUpdated = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);



  const handleDeleteOrder = async (orderId: any) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذه الخطوة.")) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // تحديث قائمة الطلبات بعد الحذف بنجاح
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        alert("حدث خطأ أثناء حذف الطلب.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("فشل الاتصال بالسيرفر لحذف الطلب.");
    }
  };


  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        searchQuery === "" ||
        order.id.toString().includes(searchQuery) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone.includes(searchQuery) ||
        (order.customerEmail || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      const matchesBranch = branchFilter === "All" || order.branchId.toString() === branchFilter;
      const matchesPayment = paymentFilter === "All" ||
        (paymentFilter === "Card" ? (order.paymentMethod === "Card" || order.paymentMethod === "palpay") : order.paymentMethod === "Cash");

      const orderDate = new Date(order.createdAt);
      const now = new Date();
      let matchesPeriod = true;
      if (periodFilter === "Today") {
        matchesPeriod = orderDate.toDateString() === now.toDateString();
      } else if (periodFilter === "Yesterday") {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        matchesPeriod = orderDate.toDateString() === yesterday.toDateString();
      } else if (periodFilter === "This Week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesPeriod = orderDate >= weekAgo;
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesPayment && matchesPeriod;
    });
  }, [orders, searchQuery, statusFilter, branchFilter, paymentFilter, periodFilter]);

  const totalSales = filteredOrders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const isAr = true;

  return (
    <div className="admin-intelligence-tab">
      <style dangerouslySetInnerHTML={{
        __html: `
        .filter-section {
          background: #fff;
          border-radius: 30px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.03);
          border: 1px solid #ECEAE7;
          margin-bottom: 30px;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-label {
          font-size: 13px;
          font-weight: 800;
          color: #666;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-select {
          padding: 14px 20px;
          border-radius: 16px;
          border: 1px solid #ECEAE7;
          background: #FDFCFB;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
          transition: 0.3s;
          color: #1a1a1a;
        }
        .filter-select:focus {
          border-color: #8B0000;
          box-shadow: 0 0 0 4px rgba(139,0,0,0.05);
        }
        .search-container {
          position: relative;
          grid-column: 1 / -1;
        }
        .search-input {
          width: 100%;
          padding: 16px 50px 16px 20px;
          border-radius: 18px;
          border: 1px solid #ECEAE7;
          background: #FDFCFB;
          font-size: 15px;
          font-weight: 600;
          outline: none;
        }
        .search-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa;
        }
        .stats-banner {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          overflow-x: auto;
          padding-bottom: 15px;
        }
        .mini-stat {
          background: #fff;
          padding: 15px 25px;
          border-radius: 20px;
          border: 1px solid #ECEAE7;
          display: flex;
          flex-direction: column;
          min-width: 160px;
        }
        .mini-stat-label { font-size: 12px; color: #888; font-weight: 800; }
        .mini-stat-value { font-size: 18px; font-weight: 900; color: #1a1a1a; }
      ` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontWeight: 900, fontSize: '1.8rem', margin: 0 }}>
          {isAr ? "بوابة الكاشير" : "Cashier Portal"}
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* آخر تحديث */}
          <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 600 }}>
            آخر تحديث: {isClient ? lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ""}
          </span>
          <button
            className="btn btn-outline btn-sm"
            style={{ borderRadius: '15px' }}
            onClick={() => fetchOrders(true)}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />

      <div className="stats-banner">
        <div className="mini-stat">
          <span className="mini-stat-label">{isAr ? "إجمالي الطلبات" : "Total Orders"}</span>
          <span className="mini-stat-value">{totalOrders}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">{isAr ? "إجمالي المبيعات" : "Total Sales"}</span>
          <span className="mini-stat-value">{totalSales.toFixed(2)} ₪</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-label">{isAr ? "متوسط الطلب" : "Avg. Order"}</span>
          <span className="mini-stat-value">{avgOrderValue.toFixed(2)} ₪</span>
        </div>
      </div>

      {/* 🔍 FILTER SECTION */}
      <div className="filter-section">
        <div className="filter-grid">
          <div className="search-container">
            <input
              className="search-input"
              placeholder={isAr ? "رقم الطلب، الاسم، الهاتف، العنوان..." : "Search ID, Name, Phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="search-icon" size={20} />
          </div>

          <div className="filter-group">
            <span className="filter-label"><LayoutGrid size={14} /> {isAr ? "الفرع" : "Branch"}</span>
            <select className="filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="All">{isAr ? "كل الفروع" : "All Branches"}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id.toString()}>{isAr ? b.nameAr : b.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label"><Filter size={14} /> {isAr ? "الحالة" : "Status"}</span>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">{isAr ? "كل الحالات" : "All Statuses"}</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label"><Calendar size={14} /> {isAr ? "الفترة" : "Period"}</span>
            <select className="filter-select" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
              <option value="Today">{isAr ? "اليوم" : "Today"}</option>
              <option value="Yesterday">{isAr ? "أمس" : "Yesterday"}</option>
              <option value="This Week">{isAr ? "هذا الأسبوع" : "This Week"}</option>
              <option value="All">{isAr ? "الكل" : "All Time"}</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label"><CreditCard size={14} /> {isAr ? "طريقة الدفع" : "Payment"}</span>
            <select className="filter-select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
              <option value="All">{isAr ? "كل طرق الدفع" : "All Methods"}</option>
              <option value="Cash">{isAr ? "نقدي (كاش)" : "Cash"}</option>
              <option value="Card">{isAr ? "فیزا / بطاقة" : "Visa / Card"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📄 ORDERS TABLE */}
      <div className="admin-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{isAr ? "الطلب" : "Order"}</th>
                <th>{isAr ? "الفرع" : "Branch"}</th>
                <th>{isAr ? "الزبون" : "Customer"}</th>
                <th>{isAr ? "المبلغ" : "Amount"}</th>
                <th>{isAr ? "الدفع" : "Payment"}</th>
                <th>{isAr ? "الحالة" : "Status"}</th>
                <th>{isAr ? "التاريخ" : "Date"}</th>
                <th>{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 900 }}>#{order.id}</td>
                  <td style={{ fontSize: '12px' }}>{order.branch?.nameAr || "N/A"}</td>
                  <td>
                    <div style={{ fontWeight: 800 }}>{order.customerName}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{order.customerPhone}</div>
                  </td>
                  <td style={{ fontWeight: 900, color: '#8B0000' }}>{(order.totalAmount ?? 0).toFixed(2)} ₪</td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: order.paymentMethod === 'Cash' ? '#D97706' : '#2563EB' }}>
                      {order.paymentMethod === 'Cash' ? (isAr ? '💵 كاش' : 'Cash') : (isAr ? '💳 فيزا' : 'Visa')}
                    </span>
                  </td>
                  <td>
                    <span className={`ultra-branch-badge-fire ${order.status.toLowerCase()}`} style={{
                      background: order.status === 'Delivered' || order.status === 'Confirmed' ? '#11a85f' : order.status === 'Cancelled' ? '#e63946' : '#8B0000',
                      color: '#fff', fontSize: '11px', fontWeight: 900, padding: '4px 10px'
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: 700 }}>
                    {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setStatusModal({ orderId: order.id, currentStatus: order.status })}
                        style={{
                          height: '32px', padding: '0 12px', borderRadius: '8px',
                          border: '1px solid #e5e7eb', background: '#f9fafb',
                          fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                          color: '#1a1a1a', whiteSpace: 'nowrap'
                        }}
                      >
                        {order.status} ▼
                      </button>

                      <button
                        style={{ height: '32px', padding: '0 12px', background: '#000', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          const res = await getOrderSummary(order.id);
                          console.log("order data:", res.order); // ← شوف إذا notes موجود

                          if (res.success) setSelectedOrder(res.order);
                        }}
                      >
                        تفاصيل
                      </button>

                      <PrintReceiptButton order={order} />

                      {!isCashier && (
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                            background: '#fee2e2', color: '#b91c1c', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                    {isAr ? "لا توجد طلبات تطابق الفلترة الحالية" : "No orders matching current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔍 ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(10px)'
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            background: '#fff', borderRadius: '40px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', direction: 'rtl'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '25px', left: '25px', border: 'none', background: '#f5f5f5', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '20px' }}
            ><X size={20} /></button>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>تفاصيل الطلب #{selectedOrder.id}</h3>
              <p style={{ color: '#888', fontWeight: 700, marginTop: '5px' }}>{new Date(selectedOrder.created_at).toLocaleString('ar-EG')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', background: '#f9f9f9', padding: '25px', borderRadius: '30px', border: '1px solid #eee' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>العميل</label>
                <div style={{ fontWeight: 900, color: '#1a1a1a' }}>{selectedOrder.customer_name}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>رقم الهاتف</label>
                <div style={{ fontWeight: 900, color: '#1a1a1a' }}>{selectedOrder.customer_phone}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>العنوان / مكان الاستلام</label>
                <div style={{ fontWeight: 900, color: '#1a1a1a' }}>{selectedOrder.address || selectedOrder.table_number || 'غير محدد'}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>طريقة الدفع</label>
                <div style={{ fontWeight: 900, color: '#8B0000' }}>{selectedOrder.payment_method === 'Cash' ? 'نقدي' : 'فيزا / بطاقة'}</div>
              </div>

              {/* عرض رسوم التوصيل */}
              <div>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>رسوم التوصيل</label>
                <div style={{ fontWeight: 900, color: '#1a1a1a' }}>
                  {selectedOrder.delivery_fee && Number(selectedOrder.delivery_fee) > 0
                    ? `${selectedOrder.delivery_fee} ₪`
                    : selectedOrder.order_type === 'Delivery' ? '🎉 مجاني' : '— (استلام)'}
                </div>
              </div>

              {/* خصم الفاتورة */}
              {selectedOrder.invoice_discount_amount > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>خصم الفاتورة</label>
                  <div style={{ fontWeight: 900, color: '#059669' }}>
                    -{Number(selectedOrder.invoice_discount_amount).toFixed(2)} ₪
                    {selectedOrder.invoice_discount_type === 'percentage'
                      ? ` (${Math.round((Number(selectedOrder.invoice_discount_amount) / ((Number(selectedOrder.total_amount) - Number(selectedOrder.delivery_fee || 0) + Number(selectedOrder.invoice_discount_amount)) || 1)) * 100)}%)`
                      : ""}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: '#999', fontWeight: 800, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>الإجمالي النهائي</label>
                <div style={{ fontWeight: 900, color: '#8B0000', fontSize: '1.3rem' }}>{Math.round(selectedOrder.total_amount)} ₪</div>
              </div>
            </div>

            <h4 style={{ fontWeight: 900, marginBottom: '20px', fontSize: '1.1rem' }}>📦 الأصناف المطلوبة</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedOrder.order_items?.map((item: any, idx: number) => (
                <div key={idx} style={{ padding: '20px', borderRadius: '24px', border: '1px solid #eee', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{item.quantity}x {item.product_name_ar}</span>
                    <div style={{ textAlign: 'end', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {item.original_price && Number(item.original_price) > Number(item.price) && (
                        <>
                          <span style={{ textDecoration: 'line-through', opacity: 0.4, fontSize: '12px', fontWeight: 600 }}>
                            {(Number(item.original_price) * item.quantity).toFixed(0)} ₪
                          </span>
                          <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                            خصم {Math.round((1 - Number(item.price) / Number(item.original_price)) * 100)}%
                          </span>
                        </>
                      )}
                      <span style={{ fontWeight: 900, color: '#8B0000' }}>{(Number(item.price) * item.quantity).toFixed(0)} ₪</span>
                    </div>
                  </div>

                  {item.addon_details && (
                    <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', background: '#fcfcfc', padding: '15px', borderRadius: '15px', border: '1px solid #f0f0f0', marginTop: '10px' }}>
                      {parseFamilyMeal(item.addon_details) ? (
                        <FamilyMealDetails addonDetails={item.addon_details} isAr={true} />
                      ) : (
                        // fallback — نص مفرمت قديم (لو مش JSON وجبة عائلية)
                        item.addon_details.split(' | ').map((part: string, pIdx: number) => {
                          const isWithout = part.includes('بدون') || part.includes('Without') || part.startsWith('🚫');
                          const isNote = part.includes('ملاحظة') || part.includes('Note');
                          return (
                            <div key={pIdx} style={{
                              color: isWithout ? '#e63946' : isNote ? '#888' : '#333',
                              fontWeight: isWithout ? 800 : 600,
                              marginBottom: '4px'
                            }}>
                              {isWithout ? '🚫 ' : isNote ? '📝 ' : '• '}{part.replace('🚫', '').trim()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 📝 ملاحظة الفاتورة */}
            {selectedOrder.notes && (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                borderRadius: '20px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
              }}>
                <label style={{
                  fontSize: '11px', color: '#92400E', fontWeight: 800,
                  display: 'block', marginBottom: '8px', textTransform: 'uppercase'
                }}>
                  📝 ملاحظة على الطلب
                </label>
                <p style={{ margin: 0, fontWeight: 700, color: '#78350F', lineHeight: '1.6' }}>
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedOrder(null)}
              style={{ width: '100%', marginTop: '30px', padding: '20px', borderRadius: '20px', border: 'none', background: '#000', color: '#fff', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}
            >إغلاق النافذة</button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(10px)'
        }} onClick={() => setConfirmModal(null)}>
          <div style={{
            background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '420px',
            padding: '32px', border: '0.5px solid #eee', direction: 'rtl',
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>تأكيد استلام الطلب</p>
                <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>#{confirmModal.orderId}</p>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#FFF4F4', border: '1px solid #8B0000',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B0000" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px' }}>حدد الوقت المقدر للتجهيز</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {['10', '15', '20', '30', '45', '60'].map(t => {
                const val = `${t} دقيقة`;
                const isSelected = estimatedTime === val;
                return (
                  <button key={t} onClick={() => setEstimatedTime(val)} style={{
                    padding: '14px 8px', borderRadius: '14px',
                    border: isSelected ? '2px solid #8B0000' : '1px solid #eee',
                    background: isSelected ? '#FFF4F4' : '#fafafa',
                    cursor: 'pointer', textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#8B0000' : '#1a1a1a', margin: 0 }}>{t}</p>
                    <p style={{ fontSize: '11px', color: isSelected ? '#B91C1C' : '#999', margin: 0 }}>دقيقة</p>
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="أو اكتب وقتاً مخصصاً..."
              value={estimatedTime}
              onChange={e => setEstimatedTime(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                border: '1px solid #eee', fontSize: '14px', marginBottom: '24px',
                boxSizing: 'border-box', outline: 'none', background: '#fafafa'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setConfirmModal(null); setStatusModal({ orderId: confirmModal.orderId, currentStatus: 'Pending' }); }} style={{
                flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #eee',
                background: '#f5f5f5', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
              }}>رجوع</button>
              <button onClick={async () => {
                const res = await updateOrderStatus(confirmModal.orderId, confirmModal.newStatus, estimatedTime);
                if (res.success) { setConfirmModal(null); handleStatusUpdated(); }
                else alert('فشل التحديث: ' + res.error);
              }} style={{
                flex: 2, padding: '14px', borderRadius: '16px', border: 'none',
                background: '#8B0000', color: '#fff', fontWeight: 700,
                fontSize: '14px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                تأكيد الاستلام
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(10px)'
        }} onClick={() => setStatusModal(null)}>
          <div style={{
            background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '460px',
            padding: '32px', border: '0.5px solid #eee', direction: 'rtl',
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 4px' }}>تغيير حالة الطلب</p>
                <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>#{statusModal.orderId}</p>
              </div>
              <button onClick={() => setStatusModal(null)} style={{
                width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #eee',
                background: '#f5f5f5', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '14px'
              }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { status: 'Pending', label: 'قيد الانتظار', sub: 'Pending', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
                { status: 'Confirmed', label: 'تم التأكيد', sub: 'Confirmed', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg> },
                { status: 'Preparing', label: 'قيد التحضير', sub: 'Preparing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg> },
                { status: 'Dispatched', label: 'في الطريق', sub: 'Dispatched', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /><path d="M8 17.5h7M1 2h2l2.5 12h11l2-7H6" /></svg> },
                { status: 'Delivered', label: 'تم التسليم', sub: 'Delivered', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
              ].map(({ status, label, sub, icon }) => {
                const isCurrent = statusModal.currentStatus === status;
                return (
                  <button key={status} onClick={async () => {
                    if (status === 'Confirmed') {
                      setEstimatedTime('');
                      setConfirmModal({ orderId: statusModal.orderId, newStatus: status });
                      setStatusModal(null);
                    } else {
                      const res = await updateOrderStatus(statusModal.orderId, status);
                      if (res.success) { setStatusModal(null); handleStatusUpdated(); }
                      else alert('فشل التحديث: ' + res.error);
                    }
                  }} style={{
                    padding: '16px 12px', borderRadius: '16px',
                    border: isCurrent ? '2px solid #8B0000' : '1px solid #eee',
                    background: isCurrent ? '#FFF4F4' : '#fafafa',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: '10px', position: 'relative', textAlign: 'right'
                  }}>
                    <span style={{ color: isCurrent ? '#8B0000' : '#666' }}>{icon}</span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#8B0000' : '#1a1a1a', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: '11px', color: isCurrent ? '#B91C1C' : '#999', margin: 0 }}>{sub}</p>
                    </div>
                    {isCurrent && <span style={{ position: 'absolute', top: '-8px', right: '10px', background: '#8B0000', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '20px' }}>الحالية</span>}
                  </button>
                );
              })}

              <button onClick={async () => {
                const res = await updateOrderStatus(statusModal.orderId, 'Cancelled');
                if (res.success) { setStatusModal(null); handleStatusUpdated(); }
                else alert('فشل التحديث: ' + res.error);
              }} style={{
                padding: '16px 12px', borderRadius: '16px', border: '1px solid #F09595',
                background: '#FCEBEB', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '10px', gridColumn: 'span 2', textAlign: 'right'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#791F1F', margin: 0 }}>إلغاء الطلب</p>
                  <p style={{ fontSize: '11px', color: '#A32D2D', margin: 0 }}>Cancel order</p>
                </div>
              </button>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '10px' }}>
              <button onClick={() => setStatusModal(null)} style={{
                flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #eee',
                background: '#f5f5f5', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
              }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}