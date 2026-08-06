"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, XCircle, Search, Loader2, Filter } from "lucide-react";
import { fetchAdmin } from "@/lib/auth";
import { io } from "socket.io-client";
import { useAuthStore } from "@/lib/auth";
import Pagination from "@/components/Pagination";

interface OrderItem { quantity: number; menuItem: { name: string; imageUrl?: string }; notes?: string; priceAtOrder: number; subtotal: number; variantSelected?: any; }
interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string;
  subtotal: number; discountAmount: number; taxAmount: number; serviceCharge: number; total: number; createdAt: string;
  table?: { tableNumber: string };
  orderItems: OrderItem[];
  payment?: { status: string };
  cashier?: { name: string };
  chef?: { name: string };
  customerName?: string | null;
  customer?: { phone: string | null } | null;
  promotion?: { id: string; name: string } | null;
  promotionId?: string | null;
}

const STATUS_LABELS: Record<string, string> = { awaiting_payment: "Menunggu Pembayaran", pending: "Menunggu", cooking: "Dimasak", ready: "Siap", served: "Disajikan", completed: "Selesai", cancelled: "Dibatalkan" };
const NEXT_STATUS: Record<string, string> = { pending: "cooking", cooking: "ready", ready: "served", served: "completed" };
const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [cashReceived, setCashReceived] = useState<string>("");
  const [activePromos, setActivePromos] = useState<{id: string, name: string}[]>([]);
  const socketRef = useRef<any>(null);
  
  // Shift state
  const [hasOpenShift, setHasOpenShift] = useState<boolean>(true); // assume true first to prevent flash

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      const res = await fetchAdmin<{ data: Order[], meta: any }>(`/api/admin/orders?${params}`);
      setOrders(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
      
      // Check shift if user is kasir
      if (user?.role === "kasir") {
        const shiftRes = await fetchAdmin<{ success: boolean; data: any }>("/api/admin/shifts/current");
        setHasOpenShift(!!shiftRes.data);
      }
      
      // Fetch promos if kasir
      if (user?.role === "kasir" || user?.role === "admin") {
        const promoRes = await fetchAdmin<{ success: boolean; data: any[] }>("/api/admin/promotions/active").catch(() => null);
        if (promoRes?.success) setActivePromos(promoRes.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // Real-time
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");
    socketRef.current = socket;
    socket.on("connect", () => {
      if (user?.restaurant?.id) socket.emit("join:restaurant", user.restaurant.id);
    });
    socket.on("order:new", () => loadOrders());
    socket.on("order:status_updated", () => loadOrders());
    return () => { socket.disconnect(); };
  }, [statusFilter, page, limit]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await fetchAdmin(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((prev) => prev ? { ...prev, status } : null);
    } catch { /* ignore */ }
  };

  const applyPromo = async (orderId: string, promotionId: string | null) => {
    try {
      const res = await fetchAdmin<{ success: boolean; data: Order; message: string }>(`/api/admin/orders/${orderId}/promo`, {
        method: "PATCH",
        body: JSON.stringify({ promotionId })
      });
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
        setSelectedOrder(res.data);
      }
    } catch (err: any) {
      alert(err.message || "Gagal memasang promo");
    }
  };

  const canUpdateStatus = (currentStatus: string) => {
    if (!user || user.role === "admin") return false;
    if (user.role === "kasir") {
      return currentStatus === "pending";
    }
    if (user.role === "chef") {
      return ["cooking", "ready", "served"].includes(currentStatus);
    }
    return false;
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.order) return;
    try {
      await fetchAdmin(`/api/admin/orders/${paymentModal.order.id}/pay`, {
        method: "PUT",
        body: JSON.stringify({ amountReceived: parseInt(cashReceived.replace(/\D/g, "")) || 0 })
      });
      setPaymentModal({ open: false, order: null });
      setCashReceived("");
      await loadOrders();
      setSelectedOrder(null);
    } catch { /* ignore */ }
  };

  const filteredOrders = orders.filter((o) => !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.table?.tableNumber?.includes(search));

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Pesanan Masuk</h1>
        <button onClick={loadOrders} className="btn btn-outline btn-icon">
          <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input className="input" placeholder="Cari nomor order / meja…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", "awaiting_payment", "pending", "cooking", "ready", "served", "completed"].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`btn ${statusFilter === s ? "btn-primary" : "btn-outline"}`}>
                {s === "all" ? "Semua" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "1fr 340px" : "1fr", gap: 16 }}>
          {/* Orders Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
                <Loader2 size={28} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Order</th>
                      <th>Meja</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Bayar</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Tidak ada pesanan</td></tr>
                    ) : filteredOrders.map((order) => (
                      <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(order)}>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }}>{order.orderNumber}</span>
                          {order.customerName && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{order.customerName}</div>}
                        </td>
                        <td><span style={{ fontWeight: 600 }}>Meja {order.table?.tableNumber || "-"}</span></td>
                        <td><span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{order.orderItems.reduce((s, i) => s + i.quantity, 0)} item</span></td>
                        <td><span style={{ fontWeight: 700 }}>{formatRupiah(order.total)}</span></td>
                        <td><span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></td>
                        <td>
                          <span className={`badge ${order.paymentStatus === "paid" ? "badge-paid" : order.paymentStatus === "waiting_at_cashier" ? "badge-waiting" : "badge-unpaid"}`}>
                            {order.paymentStatus === "paid" ? "Dibayar" : order.paymentStatus === "waiting_at_cashier" ? "Di Kasir" : "Belum Bayar"}
                          </span>
                        </td>
                        <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></td>
                        <td>
                          {canUpdateStatus(order.status) && NEXT_STATUS[order.status] && (
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(order.id, NEXT_STATUS[order.status]); }}
                              className="btn btn-sm btn-primary"
                            >
                              → {STATUS_LABELS[NEXT_STATUS[order.status]]}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination 
                  page={page} 
                  limit={limit} 
                  total={total} 
                  totalPages={totalPages} 
                  onPageChange={setPage} 
                  onLimitChange={(l) => { setLimit(l); setPage(1); }} 
                />
              </div>
            )}
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <div className="card animate-slide-up" style={{ padding: 18, alignSelf: "start", position: "sticky", top: 80, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 16 }}>{selectedOrder.orderNumber}</h3>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-icon btn-outline"><XCircle size={16} /></button>
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Meja {selectedOrder.table?.tableNumber || "-"}</p>
                {selectedOrder.customerName && (
                  <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}>
                    👤 Pelanggan: {selectedOrder.customerName} {selectedOrder.customer?.phone && `(${selectedOrder.customer.phone})`}
                  </p>
                )}
                {selectedOrder.cashier && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>👨‍💼 Kasir: {selectedOrder.cashier.name}</p>}
                {selectedOrder.chef && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>👨‍🍳 Chef: {selectedOrder.chef.name}</p>}
              </div>

              {selectedOrder.orderItems.map((oi, i) => {
                let variants: any[] = [];
                if (oi.variantSelected) {
                  variants = Array.isArray(oi.variantSelected) ? oi.variantSelected : [oi.variantSelected];
                }
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{oi.quantity}× {oi.menuItem.name}</span>
                      {variants.length > 0 && (
                        <div style={{ marginLeft: 22, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                          {variants.map((v, idx) => (
                            <span key={idx} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                              - {v.name}: {v.selectedOption.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {oi.notes && <div style={{ marginLeft: 22, marginTop: 2 }}><em style={{ color: "var(--text-muted)", fontSize: 12 }}>Catatan: {oi.notes}</em></div>}
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatRupiah(oi.subtotal)}</span>
                  </div>
                );
              })}

              <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Subtotal</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{formatRupiah(selectedOrder.subtotal)}</span>
                </div>
                {(selectedOrder.discountAmount > 0 || selectedOrder.promotionId) && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--success)" }}>Diskon {selectedOrder.promotion?.name ? `(${selectedOrder.promotion.name})` : ''}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>-{formatRupiah(selectedOrder.discountAmount || 0)}</span>
                  </div>
                )}
                {selectedOrder.taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pajak (PPN)</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatRupiah(selectedOrder.taxAmount)}</span>
                  </div>
                )}
                {selectedOrder.serviceCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Biaya Layanan</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatRupiah(selectedOrder.serviceCharge)}</span>
                  </div>
                )}
                
                {selectedOrder.status === "awaiting_payment" && (
                  <div style={{ marginBottom: 12, marginTop: 12, background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                    <label className="label" style={{ marginBottom: 6, fontSize: 12 }}>Gunakan Promo</label>
                    <select 
                      className="input" 
                      style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
                      value={selectedOrder.promotionId || ""}
                      onChange={(e) => applyPromo(selectedOrder.id, e.target.value || null)}
                    >
                      <option value="">-- Tanpa Promo --</option>
                      {activePromos.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ borderTop: "1px dashed var(--border)", margin: "8px 0", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>{formatRupiah(selectedOrder.total)}</span>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {canUpdateStatus(selectedOrder.status) && NEXT_STATUS[selectedOrder.status] && (
                  <button onClick={() => updateStatus(selectedOrder.id, NEXT_STATUS[selectedOrder.status])} className="btn btn-primary" style={{ width: "100%" }}>
                    Tandai: {STATUS_LABELS[NEXT_STATUS[selectedOrder.status]]}
                  </button>
                )}
                {selectedOrder.status === "awaiting_payment" && (
                  <button onClick={() => setPaymentModal({ open: true, order: selectedOrder })} className="btn btn-accent" style={{ width: "100%" }}>
                    <CheckCircle size={16} /> Terima Pembayaran
                  </button>
                )}
                {selectedOrder.paymentStatus === "paid" && (
                  <button onClick={() => window.open(`/receipt/${selectedOrder.id}`, '_blank')} className="btn btn-outline" style={{ width: "100%" }}>
                    🖨️ Cetak Struk
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Payment Modal */}
      {paymentModal.open && paymentModal.order && (
        <div className="modal-overlay animate-fade-in" onClick={() => setPaymentModal({ open: false, order: null })}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Pembayaran — {paymentModal.order.orderNumber}</h2>

            <div style={{ background: "var(--surface-2)", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              {(paymentModal.order.discountAmount > 0 || paymentModal.order.promotionId) && (
                <div style={{ marginBottom: 12, borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{formatRupiah(paymentModal.order.subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--success)" }}>Diskon {paymentModal.order.promotion?.name ? `(${paymentModal.order.promotion.name})` : ''}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>-{formatRupiah(paymentModal.order.discountAmount || 0)}</span>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Total Tagihan</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {formatRupiah(paymentModal.order.total)}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Uang Diterima (Cash)</label>
              <input
                className="input"
                type="text"
                placeholder="Misal: 50000"
                value={cashReceived}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCashReceived(val ? formatRupiah(parseInt(val)).replace("Rp", "").trim() : "");
                }}
                style={{ fontSize: 18, fontWeight: 600, padding: 12 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {[paymentModal.order.total, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setCashReceived(formatRupiah(amt).replace("Rp", "").trim())}
                    className="btn btn-sm btn-outline"
                    style={{ flex: 1 }}
                  >
                    {amt === paymentModal.order?.total ? "Uang Pas" : formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 16px", border: "1.5px dashed var(--border)", borderRadius: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Kembalian</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: parseInt(cashReceived.replace(/\D/g, "") || "0") >= (paymentModal.order?.total || 0) ? "var(--success)" : "var(--text-muted)" }}>
                {parseInt(cashReceived.replace(/\D/g, "") || "0") >= (paymentModal.order?.total || 0)
                  ? formatRupiah(parseInt(cashReceived.replace(/\D/g, "") || "0") - (paymentModal.order?.total || 0))
                  : "Rp 0"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setPaymentModal({ open: false, order: null })} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
              <button
                onClick={handleProcessPayment}
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={parseInt(cashReceived.replace(/\D/g, "") || "0") < paymentModal.order.total}
              >
                Konfirmasi Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
