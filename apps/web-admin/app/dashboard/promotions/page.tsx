"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, Plus, Edit2, Trash2, Tag, Percent, DollarSign } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface Promotion {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  maxUsage: number | null;
  _count?: { orders: number };
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: 0,
    startDate: "",
    endDate: "",
    maxUsage: "",
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: Promotion[], meta: any }>(`/api/admin/promotions?page=${page}&limit=${limit}`);
      setPromotions(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [page, limit]);

  const openForm = (p?: Promotion) => {
    if (p) {
      setForm({
        code: p.code || "",
        discountType: p.discountType,
        discountValue: p.discountValue,
        startDate: p.startDate ? p.startDate.split('T')[0] : "",
        endDate: p.endDate ? p.endDate.split('T')[0] : "",
        maxUsage: p.maxUsage ? p.maxUsage.toString() : "",
        isActive: p.isActive,
      });
      setEditingId(p.id);
    } else {
      setForm({ code: "", discountType: "PERCENT", discountValue: 0, startDate: "", endDate: "", maxUsage: "", isActive: true });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        maxUsage: form.maxUsage ? Number(form.maxUsage) : null,
        isActive: form.isActive,
      };

      if (editingId) {
        await fetchAdmin(`/api/admin/promotions/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchAdmin("/api/admin/promotions", { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan");
    }
    setSubmitting(false);
  };

  const handleDelete = async (p: Promotion) => {
    if (p._count && p._count.orders > 0) {
      alert("Promo ini sudah pernah dipakai oleh pelanggan sehingga tidak bisa dihapus. Silakan matikan status 'Aktif'-nya saja.");
      return;
    }
    if (!confirm("Hapus kode promo ini secara permanen?")) return;
    try {
      await fetchAdmin(`/api/admin/promotions/${p.id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus");
    }
  };

  const toggleStatus = async (p: Promotion) => {
    try {
      await fetchAdmin(`/api/admin/promotions/${p.id}`, { 
        method: "PUT", 
        body: JSON.stringify({ ...p, isActive: !p.isActive }) 
      });
      loadData();
    } catch { alert("Gagal mengubah status"); }
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Promo & Diskon</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => openForm()} className="btn btn-primary">
            <Plus size={16} /> Buat Kode Promo
          </button>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, display: "flex", justifyContent: "center" }}><Loader2 size={32} color="var(--primary)" className="spin" /></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Promo</th>
                    <th>Tipe Diskon</th>
                    <th>Nominal</th>
                    <th>Periode Aktif</th>
                    <th>Kuota Terpakai</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                        <Tag size={40} style={{ opacity: 0.2, margin: "0 auto 10px" }} />
                        <p>Belum ada kode promo.</p>
                      </td>
                    </tr>
                  ) : (
                    promotions.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: 1 }}>{p.code}</div>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                            {p.discountType === 'PERCENT' ? <Percent size={14} /> : <DollarSign size={14} />}
                            {p.discountType === 'PERCENT' ? "Persen" : "Nominal"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {p.discountType === 'PERCENT' ? `${p.discountValue}%` : formatRupiah(p.discountValue)}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>
                            {p.startDate ? new Date(p.startDate).toLocaleDateString('id-ID') : "Selamanya"} 
                            <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>-</span> 
                            {p.endDate ? new Date(p.endDate).toLocaleDateString('id-ID') : "Selamanya"}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p._count?.orders || 0} {p.maxUsage ? `/ ${p.maxUsage}` : "/ ∞ (Tanpa Batas)"}</div>
                        </td>
                        <td>
                          <button 
                            onClick={() => toggleStatus(p)} 
                            className={`badge ${p.isActive ? "badge-completed" : "badge-cancelled"}`} 
                            style={{ cursor: "pointer", border: "none" }}
                          >
                            {p.isActive ? "Aktif" : "Mati"}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openForm(p)} className="btn-icon btn-outline" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(p)} className="btn-icon btn-danger" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
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
          )}
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 24, animation: "slideUp 0.2s ease" }}>
            <h2 style={{ marginBottom: 16 }}>{editingId ? "Edit Promo" : "Buat Kode Promo"}</h2>
            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div>
                  <label className="label">Kode Kupon</label>
                  <input type="text" className="input" placeholder="Contoh: HEMAT20" value={form.code || ""} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Tipe Diskon</label>
                    <select className="input" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                      <option value="PERCENT">Persentase (%)</option>
                      <option value="FIXED">Nominal Tetap (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Nominal</label>
                    <input type="number" className="input" min="0" step={form.discountType === 'PERCENT' ? "1" : "1000"} value={form.discountValue || ""} onChange={e => setForm({...form, discountValue: Number(e.target.value)})} required placeholder={form.discountType === 'PERCENT' ? "Misal: 10" : "Misal: 15000"} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Berlaku Mulai</label>
                    <input type="date" className="input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Berlaku Sampai</label>
                    <input type="date" className="input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="label">Batas Penggunaan (Max Usage)</label>
                  <input type="number" className="input" min="1" placeholder="Kosongkan jika tanpa batas (unlimited)" value={form.maxUsage || ""} onChange={e => setForm({...form, maxUsage: e.target.value})} />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>* Kosongkan tanggal jika promo berlaku selamanya.</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} style={{ width: 16, height: 16 }} />
                  <label htmlFor="isActive" style={{ fontWeight: 600 }}>Aktifkan Kupon</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Promo"}
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
