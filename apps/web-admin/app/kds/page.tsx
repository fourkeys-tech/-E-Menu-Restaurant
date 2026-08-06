"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Clock, RefreshCw, Wallet } from "lucide-react";
import { io } from "socket.io-client";
import { fetchAdmin, useAuthStore } from "@/lib/auth";

interface Order {
  id: string; orderNumber: string; status: string; createdAt: string;
  table?: { tableNumber: string };
  orderItems: Array<{ quantity: number; menuItem: { name: string }; notes?: string; variantSelected?: any }>;
}

const COLUMNS = [
  { key: "pending", label: "Pesanan Baru", color: "#D97706", bg: "#FFFBEB" },
  { key: "cooking", label: "Sedang Dimasak", color: "#2563EB", bg: "#EFF6FF" },
  { key: "ready", label: "Siap Disajikan", color: "#16A34A", bg: "#F0FDF4" },
  { key: "served", label: "Sudah Disajikan", color: "#6B7280", bg: "#F9FAFB" },
];

const NEXT_STATUS: Record<string, string> = {
  pending: "cooking",
  cooking: "ready",
  ready: "served",
};

const BUTTON_LABELS: Record<string, string> = {
  pending: "🍳 Mulai Masak",
  cooking: "✅ Siap Disajikan",
  ready: "🙌 Sudah Disajikan",
};

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isLate = minutes >= 15;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, color: isLate ? "#DC2626" : "#6B7280" }}>
      <Clock size={12} />
      <span style={{ fontSize: 12, fontWeight: isLate ? 700 : 500 }}>
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        {isLate && " ⚠️"}
      </span>
    </div>
  );
}

function KdsCard({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: string, status: string) => void }) {
  const next = NEXT_STATUS[order.status];
  return (
    <div className="kds-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16 }}>#{order.orderNumber.slice(-6)}</p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {order.table ? `Meja ${order.table.tableNumber}` : "Take Away"}
          </p>
        </div>
        <OrderTimer createdAt={order.createdAt} />
      </div>

      {/* Items */}
      <div style={{ marginBottom: 10 }}>
        {order.orderItems.map((oi, i) => (
          <div key={i} style={{ padding: "6px 0", borderBottom: i < order.orderItems.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--primary)", minWidth: 24 }}>
                {oi.quantity}×
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{oi.menuItem.name}</span>
            </div>
            {oi.notes && (
              <p style={{ fontSize: 12, color: "#D97706", marginLeft: 32, fontStyle: "italic", marginTop: 2 }}>
                📝 {oi.notes}
              </p>
            )}
            {oi.variantSelected && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 32, marginTop: 2 }}>
                {(oi.variantSelected as any).name}: {(oi.variantSelected as any).selectedOption?.label}
              </p>
            )}
          </div>
        ))}
      </div>

      {next && (
        <button
          onClick={() => onUpdateStatus(order.id, next)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 10,
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {BUTTON_LABELS[order.status]}
        </button>
      )}
    </div>
  );
}

export default function KdsPage() {
  const { user, shiftActive } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const showShiftWarning = user?.role === "kasir" && !shiftActive;
  const socketRef = useRef<any>(null);

  const loadOrders = async () => {
    try {
      const res = await fetchAdmin<{ data: Order[] }>("/api/admin/orders?limit=100");
      const active = res.data.filter((o) => ["pending", "cooking", "ready", "served"].includes(o.status));
      setOrders(active);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const playNotification = () => {
    // Create audio context beep
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadOrders();

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      if (user?.restaurant?.id) socket.emit("join:restaurant", user.restaurant.id);
    });

    socket.on("order:new", (order: any) => {
      loadOrders();
      playNotification();
      setNewOrderAlert(true);
      setTimeout(() => setNewOrderAlert(false), 3000);
    });

    socket.on("order:status_updated", () => loadOrders());

    return () => { socket.disconnect(); };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await fetchAdmin(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    } catch { /* ignore */ }
  };

  const getColumnOrders = (status: string) => orders.filter((o) => o.status === status);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* KDS Topbar */}
      <div style={{ background: "var(--primary)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 30 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "white" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>🍽️ Kitchen Display System</h1>
        {newOrderAlert && (
          <div className="animate-slide-up" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--accent)", padding: "6px 14px", borderRadius: 100 }}>
            <Bell size={15} color="white" />
            <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Pesanan Baru!</span>
          </div>
        )}
        <button onClick={loadOrders} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", color: "white" }}>
          <RefreshCw size={16} />
        </button>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ flex: 1, padding: 16, display: "flex", gap: 14, overflowX: "auto" }}>
        {COLUMNS.map((col) => {
          const colOrders = getColumnOrders(col.key);
          return (
            <div key={col.key} className="kds-column" style={{ background: col.bg, minHeight: "calc(100vh - 120px)" }}>
              {/* Column Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "6px 8px" }}>
                <div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: col.color }}>{col.label}</span>
                </div>
                <span style={{ background: col.color, color: "white", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                  {colOrders.length}
                </span>
              </div>

              {/* Orders */}
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: `3px solid ${col.color}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : colOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>✓</div>
                  <p style={{ fontSize: 13 }}>Tidak ada pesanan</p>
                </div>
              ) : (
                colOrders.map((order) => (
                  <KdsCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                ))
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      
      {showShiftWarning && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Wallet size={32} />
            </div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: "var(--text-dark)" }}>Buka Kasir Dulu!</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
              Anda belum memulai <b>Shift</b> untuk hari ini. Silakan buka kasir untuk mencatat saldo awal sebelum melayani transaksi atau memantau pesanan di KDS.
            </p>
            <Link href="/dashboard" style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "12px 24px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
              Ke Halaman Utama
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
