"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Clock, ChefHat, Utensils, Home, RefreshCw, Loader2 } from "lucide-react";
import { api, type Order, formatRupiah } from "@/lib/api";
import { io } from "socket.io-client";

const ORDER_STATUSES = [
  { key: "pending", label: "Diterima", icon: CheckCircle, desc: "Pesanan diterima oleh restoran" },
  { key: "cooking", label: "Dimasak", icon: ChefHat, desc: "Dapur sedang menyiapkan pesanan" },
  { key: "ready", label: "Siap", icon: Clock, desc: "Pesanan siap untuk disajikan" },
  { key: "served", label: "Disajikan", icon: Utensils, desc: "Pesanan sedang diantar ke meja Anda" },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, cooking: 1, ready: 2, served: 3, completed: 3,
};



export default function TrackingPage(props: { params: Promise<{ restaurantSlug: string; orderId: string }> }) {
  const params = use(props.params);
  const { restaurantSlug, orderId } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const socketRef = useRef<any>(null);

  const loadOrder = async () => {
    try {
      const data = await api.getOrderStatus(orderId);
      setOrder(data);
      setLastUpdated(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();

    // Socket.io for real-time updates
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (socketUrl) {
      const socket = io(socketUrl);
      socketRef.current = socket as any;

      socket.on("connect", () => {
        socket.emit("join:order", orderId);
        if (order?.restaurant) {
          socket.emit("join:restaurant", order.restaurant);
        }
      });

      socket.on("order:status_updated", (data: any) => {
        if (data.orderId === orderId) {
          loadOrder();
        }
      });

      return () => { socket.disconnect(); };
    } else {
      // Fallback: Poll API every 15 seconds if WebSocket is not available
      const interval = setInterval(() => {
        loadOrder();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const currentIndex = order ? STATUS_INDEX[order.status] ?? 0 : 0;
  const isCompleted = order?.status === "completed" || order?.status === "served";
  const isCancelled = order?.status === "cancelled";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>😕</div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, marginBottom: 8 }}>Pesanan Tidak Ditemukan</h2>
        <Link href={`/menu/${restaurantSlug}`} className="btn btn-primary" style={{ marginTop: 16 }}>Kembali ke Menu</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: order.restaurant.primaryColor || "#1A1A1A", padding: "20px 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>
            {order.restaurant.name}
          </h1>
          <button onClick={loadOrder} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={16} color="white" />
          </button>
        </div>

        {/* Order number card */}
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, backdropFilter: "blur(4px)" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 4 }}>Nomor Pesanan</p>
          <p style={{ color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>{order.orderNumber}</p>
          {order.table && (
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>Meja {order.table.tableNumber}</p>
          )}
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Payment Status */}
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          marginBottom: 16,
          background: order.paymentStatus === "paid" ? "#D1FAE5" : order.paymentStatus === "waiting_at_cashier" ? "#FEF3C7" : "#DBEAFE",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ fontSize: 20 }}>
            {order.paymentStatus === "paid" ? "✅" : order.paymentStatus === "waiting_at_cashier" ? "🏪" : "💳"}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--text-primary)" }}>
              {order.paymentStatus === "paid" ? "Pembayaran Berhasil" : order.paymentStatus === "waiting_at_cashier" ? "Bayar di Kasir" : "Menunggu Pembayaran"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {order.paymentStatus === "waiting_at_cashier" ? "Tunjukkan nomor pesanan ke kasir" : formatRupiah(order.total)}
            </p>
          </div>
        </div>

        {/* Simple Status Card */}
        {!isCancelled ? (() => {
          const currentStep = ORDER_STATUSES[Math.min(currentIndex, ORDER_STATUSES.length - 1)];
          const Icon = currentStep.icon;
          return (
            <div style={{ 
              background: "var(--surface)", 
              borderRadius: "var(--radius)", 
              padding: 24, 
              marginBottom: 16, 
              textAlign: "center", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              border: "1px solid var(--border)", 
              boxShadow: "0 4px 20px rgba(0,0,0,0.02)" 
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
                boxShadow: "0 0 0 8px rgba(26,26,26,0.05)",
                animation: "pulse 2s infinite",
              }}>
                <Icon size={32} color="white" />
              </div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                {currentStep.label}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{currentStep.desc}</p>
            </div>
          );
        })() : (
          <div style={{ background: "#FEF2F2", borderRadius: "var(--radius)", padding: 20, marginBottom: 16, textAlign: "center", border: "1px solid #DC2626" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: 8, color: "#DC2626" }}>Pesanan Dibatalkan</h2>
            <p style={{ color: "#DC2626", fontSize: 14 }}>Mohon maaf, pesanan Anda telah dibatalkan oleh restoran.</p>
          </div>
        )}

        {/* Order Items */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Detail Pesanan</h3>
          {order.orderItems.map((oi) => {
            let variants: any[] = [];
            if (oi.variantSelected) {
              variants = Array.isArray(oi.variantSelected) ? oi.variantSelected : [oi.variantSelected];
            }
            return (
              <div key={oi.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{oi.menuItem.name}</p>
                  {variants.length > 0 && (
                    <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                      {variants.map((v, idx) => (
                        <span key={idx} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          - {v.name}: {v.selectedOption.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {oi.notes && <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginTop: 2 }}>Catatan: {oi.notes}</p>}
                </div>
                <div style={{ textAlign: "right", paddingLeft: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>x{oi.quantity}</p>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{formatRupiah(oi.subtotal)}</p>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Subtotal</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "var(--success)" }}>Diskon {order.promotion?.name ? `(${order.promotion.name})` : ''}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--success)" }}>-{formatRupiah(order.discountAmount)}</span>
            </div>
          )}
          {order.taxAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Pajak (PPN)</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(order.taxAmount)}</span>
            </div>
          )}
          {order.serviceCharge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Biaya Layanan</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(order.serviceCharge)}</span>
            </div>
          )}

          <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--primary)" }}>{formatRupiah(order.total)}</span>
          </div>
        </div>

        <Link href={`/menu/${restaurantSlug}`} className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>
          <Home size={18} /> Kembali ke Menu
        </Link>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 6px rgba(26,26,26,0.1); } 50% { box-shadow: 0 0 0 10px rgba(26,26,26,0.05); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
