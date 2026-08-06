"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, Plus, Trash2, Bookmark, Edit2, AlertTriangle } from "lucide-react";

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [modal, setModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: Category[] }>("/api/admin/expenses/categories");
      setCategories(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal.category) {
        // Edit
        await fetchAdmin(`/api/admin/expenses/categories/${modal.category.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: newName })
        });
      } else {
        // Add
        await fetchAdmin("/api/admin/expenses/categories", {
          method: "POST",
          body: JSON.stringify({ name: newName })
        });
      }
      setModal({ open: false, category: null });
      setNewName("");
      loadCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan kategori");
    }
    setSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.category) return;
    setSubmitting(true);
    try {
      await fetchAdmin(`/api/admin/expenses/categories/${deleteModal.category.id}`, { method: "DELETE" });
      setDeleteModal({ open: false, category: null });
      loadCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kategori");
    }
    setSubmitting(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Loader2 className="spin" size={32} style={{ opacity: 0.5, margin: "0 auto" }}/></div>;

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1 }}>Kategori Pengeluaran</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => { setNewName(""); setModal({ open: true, category: null }); }} className="btn btn-primary">
            <Plus size={16} /> Tambah Kategori
          </button>
        </div>
        <div className="card">
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <Bookmark size={18} color="var(--text-secondary)" />
            <h2 style={{ fontSize: 16 }}>Daftar Kategori</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th style={{ width: 120 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Belum ada kategori yang dibuat.</td>
                </tr>
              ) : (
                categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setNewName(c.name); setModal({ open: true, category: c }); }} className="btn-icon btn-outline">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, category: c })} className="btn-icon btn-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24 }}>
            <h2 style={{ marginBottom: 16 }}>{modal.category ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Nama Kategori</label>
                <input type="text" className="input" placeholder="Misal: Belanja Bahan Baku" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal({ open: false, category: null })} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.category && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: "var(--error-bg)", color: "var(--error)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ marginBottom: 12 }}>Hapus Kategori?</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Apakah Anda yakin ingin menghapus kategori <strong>"{deleteModal.category.name}"</strong>? Pengeluaran yang sudah menggunakan kategori ini tidak akan terhapus, tetapi namanya tetap tercatat di laporan.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteModal({ open: false, category: null })} className="btn btn-outline" disabled={submitting}>Batal</button>
              <button onClick={handleConfirmDelete} className="btn btn-danger" disabled={submitting}>
                {submitting ? <Loader2 size={16} className="spin" /> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
