"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { fetchAdmin } from "@/lib/auth";
import Pagination from "@/components/Pagination";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "kasir", isActive: true
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: User[], meta: any }>(`/api/admin/users?page=${page}&limit=${limit}`);
      setUsers(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [page, limit]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: "", role: user.role, isActive: user.isActive });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "kasir", isActive: true });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const body: any = { name: formData.name, role: formData.role, isActive: formData.isActive };
        if (formData.password) body.password = formData.password;
        await fetchAdmin(`/api/admin/users/${editingUser.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await fetchAdmin("/api/admin/users", { method: "POST", body: JSON.stringify(formData) });
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus karyawan ini?")) return;
    try {
      await fetchAdmin(`/api/admin/users/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus");
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Manajemen Karyawan</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={16} /> Tambah Karyawan
          </button>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Loader2 size={28} className="spin" color="var(--primary)" /></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role === 'admin' ? 'completed' : u.role === 'kasir' ? 'ready' : 'cooking'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="badge badge-completed"><CheckCircle size={12} /> Aktif</span>
                        ) : (
                          <span className="badge badge-cancelled"><XCircle size={12} /> Nonaktif</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => handleOpenModal(u)} className="btn btn-sm btn-outline btn-icon"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(u.id)} className="btn btn-sm btn-danger btn-icon"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>Belum ada data karyawan</td></tr>
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
        <div className="modal-overlay animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>{editingUser ? "Edit Karyawan" : "Tambah Karyawan"}</h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Nama Lengkap</label>
                <input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nama" />
              </div>
              <div>
                <label className="label">Email (Untuk Login)</label>
                <input required={!editingUser} disabled={!!editingUser} type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@contoh.com" />
              </div>
              <div>
                <label className="label">Password {editingUser && "(Kosongkan jika tidak diubah)"}</label>
                <input required={!editingUser} minLength={6} type="password" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Minimal 6 karakter" />
              </div>
              <div>
                <label className="label">Role (Jabatan)</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="kasir">Kasir</option>
                  <option value="chef">Chef</option>
                </select>
              </div>
              {editingUser && (
                <div>
                  <label className="label">Status Akun</label>
                  <select className="input" value={formData.isActive ? "true" : "false"} onChange={e => setFormData({...formData, isActive: e.target.value === "true"})}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif (Resign / Cuti)</option>
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
