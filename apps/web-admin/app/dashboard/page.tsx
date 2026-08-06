"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Clock, Wallet, RefreshCw, UtensilsCrossed, Power, Lock, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchAdmin, useAuthStore } from "@/lib/auth";

interface Overview {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  waitingPayment: number;
  totalMenuItems: number;
}

interface SalesData {
  period: string;
  revenue: number;
  orders: number;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <div className="card stat-card animate-slide-up" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value" style={{ color: "var(--primary)" }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);

  // Shift State
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "", message: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ovRes, salesRes] = await Promise.all([
        fetchAdmin<{ data: Overview }>("/api/admin/reports/overview"),
        fetchAdmin<{ data: { salesData: SalesData[] } }>(`/api/admin/reports/sales?range=${range}`),
      ]);
      setOverview(ovRes.data);
      setSalesData(salesRes.data.salesData);

      if (user?.role === "kasir") {
        const shiftRes = await fetchAdmin<{ success: boolean; data: any }>("/api/admin/shifts/current");
        if (shiftRes.success) {
          setCurrentShift(shiftRes.data);
          useAuthStore.getState().setShiftActive(!!shiftRes.data);
        } else {
          useAuthStore.getState().setShiftActive(false);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetchAdmin<{ success: boolean; message?: string }>("/api/admin/shifts/open", {
        method: "POST",
        body: JSON.stringify({ openingCash: Number(openingCash) || 0 })
      });
      if (res.success) {
        setShowOpenForm(false);
        setOpeningCash("");
        useAuthStore.getState().setShiftActive(true);
        load();
      } else {
        setShowOpenForm(false);
        setErrorModal({ open: true, title: "Buka Kasir Ditolak", message: res.message || "Gagal buka kasir" });
      }
    } catch (err: any) { 
      setShowOpenForm(false);
      setErrorModal({ open: true, title: "Buka Kasir Ditolak", message: err.message || "Gagal buka kasir" }); 
    }
    setSubmitting(false);
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetchAdmin<{ success: boolean }>("/api/admin/shifts/close", {
        method: "POST",
        body: JSON.stringify({ closingCash: Number(closingCash) || 0, notes })
      });
      if (res.success) {
        setShowCloseForm(false);
        setClosingCash("");
        setNotes("");
        setCurrentShift(null);
        useAuthStore.getState().setShiftActive(false);
        load();
      }
    } catch (err: any) { alert(err.message || "Gagal tutup kasir"); }
    setSubmitting(false);
  };

  useEffect(() => { load(); }, [range, user]);

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>
          Dashboard {user?.role === 'kasir' ? "Kasir" : user?.role === 'chef' ? "Chef" : "Utama"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <button onClick={load} className="btn btn-outline btn-icon">
          <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      <div className="page-content">
        {user?.role === "kasir" && (
          <div className="card" style={{ padding: 24, marginBottom: 24, display: "flex", gap: 20, alignItems: "center", borderLeft: currentShift ? "4px solid var(--success)" : "4px solid var(--error)" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>Status Anda: {currentShift ? "Buka (Open Shift)" : "Tutup (Shift Closed)"}</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                {currentShift ? `Kas awal: ${formatRupiah(currentShift.openingCash)}. Dibuka pada: ${new Date(currentShift.openTime).toLocaleTimeString("id-ID")}` : "Anda belum melakukan Buka Kasir. Silakan buka shift Anda."}
              </p>
            </div>
            <div>
              {!currentShift ? (
                <button onClick={() => setShowOpenForm(true)} className="btn btn-primary">
                  <Power size={18} /> Buka Kasir
                </button>
              ) : (
                <button onClick={() => setShowCloseForm(true)} className="btn btn-danger">
                  <Lock size={18} /> Tutup Kasir
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {user?.role === 'admin' && (
            <>
              <StatCard label="Pendapatan Hari Ini" value={overview ? formatRupiah(overview.todayRevenue) : "—"} icon={TrendingUp} color="#16A34A" sub={`${overview?.todayOrders || 0} pesanan terbayar`} />
              <StatCard label="Pesanan Aktif" value={overview?.activeOrders?.toString() || "—"} icon={Clock} color="#2563EB" sub="Sedang diproses dapur" />
              <StatCard label="Menunggu Kasir" value={overview?.waitingPayment?.toString() || "—"} icon={Wallet} color="#D97706" sub="Bayar di kasir" />
              <StatCard label="Menu Tersedia" value={overview?.totalMenuItems?.toString() || "—"} icon={UtensilsCrossed} color="#7C3AED" sub="Item aktif" />
            </>
          )}

          {user?.role === 'kasir' && (
            <>
              <StatCard label="Omset Shift Anda" value={overview ? formatRupiah(overview.todayRevenue) : "—"} icon={Wallet} color="#16A34A" sub="Total tunai/terbayar hari ini" />
              <StatCard label="Pesanan Anda Selesaikan" value={overview?.todayOrders?.toString() || "—"} icon={TrendingUp} color="#2563EB" sub="Pesanan yang Anda proses" />
              <StatCard label="Menunggu Kasir" value={overview?.waitingPayment?.toString() || "—"} icon={Clock} color="#D97706" sub="Harus segera Anda proses" />
            </>
          )}

          {user?.role === 'chef' && (
            <>
              <StatCard label="Pesanan Selesai Masak" value={overview?.todayOrders?.toString() || "—"} icon={UtensilsCrossed} color="#16A34A" sub="Disajikan oleh Anda hari ini" />
              <StatCard label="Pesanan Aktif" value={overview?.activeOrders?.toString() || "—"} icon={Clock} color="#2563EB" sub="Dalam antrean / dimasak" />
            </>
          )}
        </div>

        <div className="card animate-slide-up" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Grafik {user?.role === 'chef' ? 'Kinerja' : 'Penjualan'}</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {user?.role === 'chef' ? 'Volume pesanan yang diselesaikan' : 'Pendapatan dari transaksi terbayar'}
              </p>
            </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["daily", "weekly", "monthly"] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)} className={`btn ${range === r ? "btn-primary" : "btn-outline"}`}>
                    {r === "daily" ? "Hari Ini" : r === "weekly" ? "7 Hari" : "Bulan Ini"}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : salesData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <div style={{ textAlign: "center" }}>
                  <ShoppingBag size={40} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                  <p>Belum ada data penjualan</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} tickFormatter={(v) => user?.role === 'chef' ? v.toString() : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => user?.role === 'chef' ? v?.toString() + ' Porsi' : formatRupiah(v as number || 0)} labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }} />
                  <Area type="monotone" dataKey={user?.role === 'chef' ? "items" : "revenue"} stroke="#1A1A1A" strokeWidth={2} fill="url(#colorRevenue)" name={user?.role === 'chef' ? "Item Dimasak" : "Pendapatan"} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
      </div>
      
      {showOpenForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <h2 style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}><Wallet size={20}/> Modal Awal Kasir</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Masukkan jumlah uang tunai yang ada di laci kasir saat ini.</p>
            <form onSubmit={handleOpenShift}>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Uang Tunai (Rp)</label>
                <input type="number" className="input" placeholder="Contoh: 150000" min="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} required />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowOpenForm(false)} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Mulai Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <h2 style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", color: "var(--error)" }}><Lock size={20}/> Tutup Kasir</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Sistem akan menghitung selisih antara uang fisik yang Anda laporkan dengan total transaksi.</p>
            <form onSubmit={handleCloseShift}>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Total Uang Tunai Fisik (Rp)</label>
                <input type="number" className="input" placeholder="Hitung seluruh uang tunai di laci" min="0" value={closingCash} onChange={e => setClosingCash(e.target.value)} required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Catatan (Opsional)</label>
                <input type="text" className="input" placeholder="Misal: uang kembalian terselip" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCloseForm(false)} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Akhiri Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorModal.open && (
        <div className="modal-overlay animate-fade-in" onClick={() => setErrorModal({ ...errorModal, open: false })}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center", padding: 24, borderRadius: 16, background: "var(--background)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: 18, marginBottom: 8, color: "var(--danger)" }}>{errorModal.title}</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
              {errorModal.message}
            </p>
            <button onClick={() => setErrorModal({ ...errorModal, open: false })} className="btn btn-primary" style={{ width: "100%" }}>
              Mengerti
            </button>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
