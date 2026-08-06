"use client";

import { useEffect, useState } from "react";
import { fetchAdmin, useAuthStore } from "@/lib/auth";
import { Loader2, History } from "lucide-react";
import Pagination from "@/components/Pagination";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDateTime = (d: string) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ShiftsPage() {
  const { user } = useAuthStore();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const listRes = await fetchAdmin<{ success: boolean; data: any[], meta: any }>(`/api/admin/shifts?page=${page}&limit=${limit}`);
      if (listRes.success) {
        setShifts(listRes.data);
        if (listRes.meta) {
          setTotal(listRes.meta.total);
          setTotalPages(listRes.meta.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user, page, limit]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Loader2 className="spin" size={32} style={{ opacity: 0.5, margin: "0 auto" }}/></div>;

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1 }}>Riwayat Shift Kasir</h1>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <History size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: 16 }}>Riwayat Shift (Semua Kasir)</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kasir</th>
                <th>Waktu Buka</th>
                <th>Waktu Tutup</th>
                <th>Modal Awal</th>
                <th>Kas Akhir</th>
                <th>Selisih (Diff)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Belum ada riwayat shift</td>
                </tr>
              ) : (
                shifts.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.user?.name || "Unknown"}</td>
                    <td>{formatDateTime(s.openTime)}</td>
                    <td>{s.closeTime ? formatDateTime(s.closeTime) : "-"}</td>
                    <td>{formatRupiah(s.openingCash)}</td>
                    <td>{s.closingCash !== null ? formatRupiah(s.closingCash) : "-"}</td>
                    <td>
                      {s.diff !== null ? (
                        <span style={{ color: s.diff === 0 ? "var(--success)" : s.diff < 0 ? "var(--error)" : "var(--primary)" }}>
                          {formatRupiah(s.diff)}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'open' ? 'badge-awaiting_payment' : ''}`} style={s.status === 'closed' ? { background: "var(--success-bg)", color: "var(--success)" } : {}}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
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
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
