"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, Users, Search, ShoppingBag, Edit2, Phone, Mail } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: Customer[], meta: any }>(`/api/admin/customers?page=${page}&limit=${limit}`);
      setCustomers(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, [page, limit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.customer) return;
    setSubmitting(true);
    try {
      await fetchAdmin(`/api/admin/customers/${modal.customer.id}`, {
        method: "PUT",
        body: JSON.stringify({ 
          name: editForm.name, 
          phone: editForm.phone || null, 
          email: editForm.email || null 
        })
      });
      setModal({ open: false, customer: null });
      loadCustomers();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan pelanggan");
    }
    setSubmitting(false);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Data Pelanggan</h1>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input 
                className="input" 
                placeholder="Cari nama atau nomor HP..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: 34, width: "100%" }} 
              />
            </div>
            <div style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
              Total: {customers.length} Pelanggan
            </div>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
                <Loader2 size={32} color="var(--primary)" className="spin" />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Nama Pelanggan</th>
                    <th>Kontak</th>
                    <th>Total Belanja</th>
                    <th>Kunjungan</th>
                    <th>Terakhir Hadir</th>
                    <th style={{ width: 80 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                        <Users size={40} style={{ opacity: 0.2, margin: "0 auto 10px" }} />
                        <p>Belum ada data pelanggan.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ color: "var(--text-secondary)" }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            {c.name}
                            {i < 3 && <span style={{ background: "var(--accent)", color: "white", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>VIP</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: c.phone ? "inherit" : "var(--text-muted)" }}>
                              <Phone size={12} /> {c.phone || "Tidak ada"}
                            </div>
                            {c.email && (
                              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--text-secondary)" }}>
                                <Mail size={12} /> {c.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {formatRupiah(c.totalSpent)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <ShoppingBag size={14} color="var(--text-secondary)" /> {c.totalVisits} kali
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                          {c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}
                        </td>
                        <td>
                          <button 
                            onClick={() => { 
                              setEditForm({ name: c.name, phone: c.phone || "", email: c.email || "" }); 
                              setModal({ open: true, customer: c }); 
                            }} 
                            className="btn-icon btn-outline"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

      {modal.open && modal.customer && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24, animation: "slideUp 0.2s ease" }}>
            <h2 style={{ marginBottom: 16 }}>Edit Pelanggan</h2>
            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input type="text" className="input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Nomor WhatsApp/HP</label>
                  <input type="tel" className="input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="08..." />
                </div>
                <div>
                  <label className="label">Email (Opsional)</label>
                  <input type="email" className="input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="email@contoh.com" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal({ open: false, customer: null })} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
