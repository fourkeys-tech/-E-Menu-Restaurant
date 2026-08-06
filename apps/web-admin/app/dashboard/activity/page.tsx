"use client";

import { useEffect, useState } from "react";
import { useAuthStore, fetchAdmin } from "@/lib/auth";
import { Loader2, ClipboardList, Clock, User } from "lucide-react";
import Pagination from "@/components/Pagination";

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

export default function ActivityLogPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetchAdmin<{ success: boolean; data: ActivityLog[], meta: any }>(`/api/admin/activity?page=${page}&limit=${limit}`);
        if (res.success) {
          setLogs(res.data);
          if (res.meta) {
            setTotal(res.meta.total);
            setTotalPages(res.meta.totalPages);
          }
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, limit]);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={32} className="spin" color="var(--primary)" /></div>;
  }

  if (user?.role !== "admin") {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Akses Ditolak. Halaman ini hanya untuk Admin.</div>;
  }

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontSize: 20 }}>Log Aktivitas (Audit Trail)</h1>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <ClipboardList size={24} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: 16 }}>Rekam Jejak Aktivitas</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Mencatat aktivitas krusial karyawan seperti pembatalan pesanan, pembayaran, dan perubahan menu.</p>
            </div>
          </div>
          
          <div style={{ padding: 20 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Belum ada log aktivitas.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ display: "flex", gap: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
                    <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: "50%" }}>
                      <Clock size={16} color="var(--text-secondary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{log.action}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                      <p style={{ fontSize: 14, marginBottom: 8 }}>{log.details}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                        <User size={14} />
                        {log.user ? `${log.user.name} (${log.user.role})` : "Sistem"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      </div>
    </div>
  );
}
