"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ShoppingBag, Users, Loader2, Download } from "lucide-react";
import { fetchAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function ReportsPage() {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [salesRes, topRes, finRes] = await Promise.all([
          fetchAdmin<{ data: any }>(`/api/admin/reports/sales?range=${range}`),
          fetchAdmin<{ data: any[] }>("/api/admin/reports/top-items?limit=10"),
          fetchAdmin<{ data: any }>("/api/admin/reports/financial-summary"),
        ]);
        setSalesData(salesRes.data.salesData);
        setSummary(salesRes.data.summary);
        setTopItems(topRes.data);
        setFinancialSummary(finRes.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [range]);

  const handleExport = () => {
    if (!salesData.length && !topItems.length) return;

    const salesSheetData: any[][] = [
      ["RINGKASAN KEUANGAN (KESELURUHAN)"],
      ["Pendapatan Hari Ini", financialSummary?.todayRevenue || 0],
      ["Pendapatan Bulan Ini", financialSummary?.monthRevenue || 0],
      ["Pendapatan Tahun Ini", financialSummary?.yearRevenue || 0],
      [],
      ["RINGKASAN PERIODE TERPILIH"],
      ["Total Pendapatan", summary?.totalRevenue || 0],
      ["Total Pengeluaran", summary?.totalExpenses || 0],
      ["Laba Bersih", summary?.netProfit || 0],
      ["Total Pesanan", summary?.totalOrders || 0],
      ["Total Item Terjual", summary?.totalItems || 0],
      [],
      ["DATA DETAIL PERIODE"],
      ["Periode", "Pendapatan", "Pengeluaran", "Laba Bersih"]
    ];
    salesData.forEach(row => {
      salesSheetData.push([row.period, row.revenue, row.expenses || 0, row.profit || 0]);
    });

    const wsSales = XLSX.utils.aoa_to_sheet(salesSheetData);
    
    // Formatting widths
    wsSales["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

    // 2. Data Menu Terlaris (Sheet 2)
    const topItemsData: any[][] = [
      ["Peringkat", "Nama Menu", "Kategori", "Jumlah Terjual", "Total Penjualan (Rp)"]
    ];
    topItems.forEach((item, index) => {
      topItemsData.push([
        index + 1,
        item.menuItem?.name || "Unknown",
        item.menuItem?.category?.name || "Unknown",
        item._sum?.quantity || 0,
        item._sum?.subtotal || 0
      ]);
    });

    const wsTopItems = XLSX.utils.aoa_to_sheet(topItemsData);
    wsTopItems["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSales, "Ringkasan Penjualan");
    XLSX.utils.book_append_sheet(wb, wsTopItems, "Menu Terlaris");

    // Download file
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Laporan_Penjualan_${range}_${dateStr}.xlsx`);
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Laporan Penjualan</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {(["daily", "weekly", "monthly"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`btn ${range === r ? "btn-primary" : "btn-outline"}`}>
              {r === "daily" ? "30 Hari" : r === "weekly" ? "12 Minggu" : "12 Bulan"}
            </button>
          ))}
          <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
          <button onClick={handleExport} className="btn btn-outline" disabled={loading || (salesData.length === 0 && topItems.length === 0)}>
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* Financial Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Pendapatan Hari Ini", value: formatRupiah(financialSummary?.todayRevenue || 0), color: "#2563EB" },
                { label: "Pendapatan Bulan Ini", value: formatRupiah(financialSummary?.monthRevenue || 0), color: "#7C3AED" },
                { label: "Pendapatan Tahun Ini", value: formatRupiah(financialSummary?.yearRevenue || 0), color: "#D97706" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 18, borderLeft: `4px solid ${s.color}` }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--primary)" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Period Summary Cards */}
            <h2 style={{ fontSize: 15, marginBottom: 12, color: "var(--text-secondary)" }}>Ringkasan Periode Terpilih</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Pemasukan", value: formatRupiah(summary?.totalRevenue || 0), icon: TrendingUp, color: "#16A34A" },
                { label: "Total Pengeluaran", value: formatRupiah(summary?.totalExpenses || 0), icon: TrendingUp, color: "#DC2626" },
                { label: "Laba Bersih", value: formatRupiah(summary?.netProfit || 0), icon: TrendingUp, color: (summary?.netProfit || 0) >= 0 ? "#16A34A" : "#DC2626" },
                { label: "Total Pesanan", value: (summary?.totalOrders || 0).toString(), icon: ShoppingBag, color: "#2563EB" },
                { label: "Item Terjual", value: (summary?.totalItems || 0).toString(), icon: Users, color: "#7C3AED" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 18, borderLeft: `4px solid ${s.color}` }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--primary)" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, marginBottom: 16 }}>Grafik Pendapatan</h2>
              {salesData.length === 0 ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column" }}>
                  <ShoppingBag size={40} style={{ marginBottom: 10, opacity: 0.3 }} />
                  <p>Belum ada data penjualan</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatRupiah(v as number)} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={2} fill="url(#gradRev)" name="Pemasukan" />
                    <Area type="monotone" dataKey="expenses" stroke="#DC2626" strokeWidth={2} fill="url(#gradExp)" name="Pengeluaran" />
                    <Area type="monotone" dataKey="profit" stroke="#2563EB" strokeWidth={2} fill="url(#gradProfit)" name="Laba Bersih" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Items */}
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, marginBottom: 16 }}>Menu Terlaris</h2>
              {topItems.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Belum ada data</p>
              ) : (
                <div>
                  {topItems.map((item, i) => (
                    <div key={item.menuItemId} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "var(--primary)" : "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "white" : "var(--text-secondary)" }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.menuItem?.name || "—"}</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.menuItem?.category?.name}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item._sum?.quantity || 0} terjual</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatRupiah(item._sum?.subtotal || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
