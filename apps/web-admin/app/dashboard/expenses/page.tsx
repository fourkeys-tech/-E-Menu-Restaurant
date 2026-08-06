"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import Pagination from "@/components/Pagination";

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ amount: "", category: "Bahan Baku", description: "", date: new Date().toISOString().split("T")[0] });
  const [submitting, setSubmitting] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        fetchAdmin<{ success: boolean; data: any }>(`/api/admin/expenses?month=${month}&year=${year}&page=${page}&limit=${limit}`),
        fetchAdmin<{ success: boolean; data: any[] }>("/api/admin/expenses/categories")
      ]);
      
      if (expRes.success) {
        setExpenses(expRes.data.expenses);
        setTotal(expRes.data.total);
        if (expRes.data.meta) {
          setTotalItems(expRes.data.meta.total);
          setTotalPages(expRes.data.meta.totalPages);
        }
      }
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: catRes.data[0].name }));
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, [month, year, page, limit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) return;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString()
      };
      const res = await fetchAdmin<{ success: boolean }>("/api/admin/expenses", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.success) {
        setShowForm(false);
        setFormData({ amount: "", category: categories[0]?.name || "", description: "", date: new Date().toISOString().split("T")[0] });
        loadExpenses();
      }
    } catch (err) {
      alert("Gagal menyimpan pengeluaran");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      await fetchAdmin(`/api/admin/expenses/${id}`, { method: "DELETE" });
      loadExpenses();
    } catch (err) {
      alert("Gagal menghapus data");
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1 }}>Pengeluaran Kas</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
            <button 
              key={m} 
              onClick={() => { setMonth(m); setPage(1); }} 
              className={`btn ${month === m ? "btn-primary" : "btn-outline"}`}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {new Date(2024, m-1, 1).toLocaleString('id-ID', { month: 'short' })}
            </button>
          ))}
          <select className="input" style={{ width: 90, minHeight: 38, padding: "8px 12px" }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={16} /> Catat Pengeluaran
          </button>
        </div>
        <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: "4px solid var(--error)" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Pengeluaran Bulan Ini</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "var(--error)" }}>{formatRupiah(total)}</p>
        </div>

        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Nominal</th>
                <th>Pencatat</th>
                <th style={{ width: 80 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40 }}>
                    <Loader2 size={24} className="spin" style={{ margin: "0 auto", opacity: 0.5 }} />
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    <Receipt size={40} style={{ margin: "0 auto 10px", opacity: 0.2 }} />
                    Tidak ada pengeluaran di bulan ini
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{formatDate(exp.date)}</td>
                    <td><span className="badge" style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>{exp.category}</span></td>
                    <td>{exp.description || "-"}</td>
                    <td style={{ fontWeight: 600, color: "var(--error)" }}>{formatRupiah(exp.amount)}</td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{exp.user?.name || "System"}</td>
                    <td>
                      <button onClick={() => handleDelete(exp.id)} className="btn-icon" style={{ color: "var(--error)" }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination 
            page={page} 
            limit={limit} 
            total={totalItems} 
            totalPages={totalPages} 
            onPageChange={setPage} 
            onLimitChange={(l) => { setLimit(l); setPage(1); }} 
          />
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <h2 style={{ marginBottom: 16 }}>Catat Pengeluaran Baru</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Kategori</label>
                {categories.length === 0 ? (
                  <div style={{ padding: 10, background: "var(--warning-bg)", color: "var(--warning)", borderRadius: 6, fontSize: 13 }}>
                    Anda belum membuat Kategori Pengeluaran. Silakan buat di menu Kategori Pengeluaran.
                  </div>
                ) : (
                  <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required>
                    <option value="" disabled>Pilih Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="label">Nominal (Rp)</label>
                <input type="number" className="input" placeholder="Contoh: 50000" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Keterangan (Opsional)</label>
                <input type="text" className="input" placeholder="Contoh: Beli es batu kristal" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan"}
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
