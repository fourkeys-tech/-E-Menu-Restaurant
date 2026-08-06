"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, Bookmark, Plus, Edit2, Trash2, CalendarDays, Clock, Users as UsersIcon, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface Table {
  tableNumber: string;
  label: string | null;
}

interface Reservation {
  id: string;
  customerName: string;
  phone: string | null;
  tableId: string | null;
  reservationDate: string;
  guestCount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  table?: Table | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending,confirmed");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Options
  const [tables, setTables] = useState<{ id: string; tableNumber: string }[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    tableId: "",
    date: "",
    time: "",
    guestCount: 1,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, resTables] = await Promise.all([
        fetchAdmin<{ data: Reservation[], meta: any }>(`/api/admin/reservations?status=${filter}&page=${page}&limit=${limit}`),
        fetchAdmin<{ data: { id: string; tableNumber: string }[] }>("/api/admin/tables"),
      ]);
      setReservations(resRes.data);
      if (resRes.meta) {
        setTotal(resRes.meta.total);
        setTotalPages(resRes.meta.totalPages);
      }
      setTables(resTables.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [filter, page, limit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Combine date and time to ISO
      const datetime = new Date(`${form.date}T${form.time}`).toISOString();
      const payload = {
        customerName: form.customerName,
        phone: form.phone || undefined,
        tableId: form.tableId || undefined,
        reservationDate: datetime,
        guestCount: Number(form.guestCount),
        notes: form.notes || undefined,
      };

      if (editingId) {
        await fetchAdmin(`/api/admin/reservations/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchAdmin("/api/admin/reservations", { method: "POST", body: JSON.stringify(payload) });
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan");
    }
    setSubmitting(false);
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await fetchAdmin(`/api/admin/reservations/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus reservasi ini secara permanen?")) return;
    try {
      await fetchAdmin(`/api/admin/reservations/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus");
    }
  };

  const openForm = (res?: Reservation) => {
    if (res) {
      const d = new Date(res.reservationDate);
      const tzOffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
      
      const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const localTime = d.toTimeString().slice(0, 5); // HH:MM
      
      setForm({
        customerName: res.customerName,
        phone: res.phone || "",
        tableId: res.tableId || "",
        date: localDate,
        time: localTime,
        guestCount: res.guestCount,
        notes: res.notes || "",
      });
      setEditingId(res.id);
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const localStr = now.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm
      
      setForm({
        customerName: "",
        phone: "",
        tableId: "",
        date: localStr.split('T')[0],
        time: localStr.split('T')[1],
        guestCount: 2,
        notes: "",
      });
      setEditingId(null);
    }
    setModalOpen(true);
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Reservasi Meja</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => openForm()} className="btn btn-primary">
            <Plus size={16} /> Tambah Reservasi
          </button>
        </div>
        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button onClick={() => { setFilter("pending,confirmed"); setPage(1); }} className={`btn ${filter === "pending,confirmed" ? "btn-primary" : "btn-outline"}`}>Aktif</button>
          <button onClick={() => { setFilter("completed"); setPage(1); }} className={`btn ${filter === "completed" ? "btn-primary" : "btn-outline"}`}>Selesai</button>
          <button onClick={() => { setFilter("cancelled"); setPage(1); }} className={`btn ${filter === "cancelled" ? "btn-primary" : "btn-outline"}`}>Batal</button>
          <button onClick={() => { setFilter("all"); setPage(1); }} className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`}>Semua</button>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, display: "flex", justifyContent: "center" }}><Loader2 size={32} color="var(--primary)" className="spin" /></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu Reservasi</th>
                    <th>Nama Pemesan</th>
                    <th>Meja</th>
                    <th>Jml Tamu</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                        <Bookmark size={40} style={{ opacity: 0.2, margin: "0 auto 10px" }} />
                        <p>Tidak ada data reservasi.</p>
                      </td>
                    </tr>
                  ) : (
                    reservations.map((r) => {
                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                              <CalendarDays size={14} color="var(--text-secondary)" />
                              {new Date(r.reservationDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              <span style={{ color: "var(--border)" }}>|</span>
                              <Clock size={14} color="var(--text-secondary)" />
                              {new Date(r.reservationDate).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.customerName}</div>
                            {r.phone && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>📞 {r.phone}</div>}
                            {r.notes && <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 4 }}>Note: {r.notes}</div>}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: r.tableId ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {r.tableId ? `Meja ${r.table?.tableNumber}` : "Belum Plot Meja"}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                              <UsersIcon size={14} /> {r.guestCount}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {r.status === 'pending' && (
                                <button onClick={() => handleStatus(r.id, 'confirmed')} className="btn btn-sm btn-outline" style={{ color: "var(--success)" }} title="Konfirmasi">
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {r.status === 'confirmed' && (
                                <button onClick={() => handleStatus(r.id, 'completed')} className="btn btn-sm btn-primary" title="Selesai">
                                  Selesai
                                </button>
                              )}
                              {(r.status === 'pending' || r.status === 'confirmed') && (
                                <button onClick={() => handleStatus(r.id, 'cancelled')} className="btn btn-sm btn-outline" style={{ color: "var(--error)" }} title="Batalkan">
                                  <XCircle size={14} />
                                </button>
                              )}
                              <button onClick={() => openForm(r)} className="btn-icon btn-outline" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(r.id)} className="btn-icon btn-danger" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

      {/* Modal Form */}
      {modalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, padding: 24, animation: "slideUp 0.2s ease" }}>
            <h2 style={{ marginBottom: 16 }}>{editingId ? "Edit Reservasi" : "Reservasi Baru"}</h2>
            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div>
                  <label className="label">Nama Tamu</label>
                  <input type="text" className="input" placeholder="Nama Pemesan" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required />
                </div>
                <div>
                  <label className="label">No. Telepon / WA (Opsional)</label>
                  <input type="tel" className="input" placeholder="08..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Tanggal</label>
                    <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">Jam</label>
                    <input type="time" className="input" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Plot Meja (Opsional)</label>
                    <select className="input" value={form.tableId} onChange={e => setForm({...form, tableId: e.target.value})}>
                      <option value="">-- Pilih Meja --</option>
                      {tables.map(t => <option key={t.id} value={t.id}>Meja {t.tableNumber}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Jumlah Tamu</label>
                    <input type="number" className="input" min="1" value={form.guestCount} onChange={e => setForm({...form, guestCount: Number(e.target.value)})} required />
                  </div>
                </div>
                <div>
                  <label className="label">Catatan Tambahan (Opsional)</label>
                  <textarea className="input" placeholder="Misal: Ulang tahun, minta kursi bayi..." rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ resize: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Reservasi"}
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
