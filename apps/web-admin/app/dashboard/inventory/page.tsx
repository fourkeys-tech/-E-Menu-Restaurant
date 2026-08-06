"use client";

import { useEffect, useState } from "react";
import { fetchAdmin } from "@/lib/auth";
import { Loader2, PackageSearch, Search, Plus, Edit2, Trash2, ArrowDownCircle, ArrowUpCircle, AlertCircle, History } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  updatedAt: string;
}

interface InventoryTransaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note?: string;
  createdAt: string;
  user: { name: string };
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [itemModal, setItemModal] = useState<{ open: boolean; item: InventoryItem | null }>({ open: false, item: null });
  const [itemForm, setItemForm] = useState({ name: "", unit: "", minStock: 0 });
  
  const [trxModal, setTrxModal] = useState<{ open: boolean; item: InventoryItem | null; type: 'IN' | 'OUT' }>({ open: false, item: null, type: 'IN' });
  const [trxForm, setTrxForm] = useState({ quantity: "", note: "" });
  
  const [historyModal, setHistoryModal] = useState<{ open: boolean; item: InventoryItem | null }>({ open: false, item: null });
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: InventoryItem[], meta: any }>(`/api/admin/inventory?page=${page}&limit=${limit}`);
      setItems(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, [page, limit]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (itemModal.item) {
        await fetchAdmin(`/api/admin/inventory/${itemModal.item.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...itemForm, minStock: Number(itemForm.minStock) })
        });
      } else {
        await fetchAdmin("/api/admin/inventory", {
          method: "POST",
          body: JSON.stringify({ ...itemForm, minStock: Number(itemForm.minStock) })
        });
      }
      setItemModal({ open: false, item: null });
      loadItems();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan barang");
    }
    setSubmitting(false);
  };

  const handleSaveTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxModal.item) return;
    setSubmitting(true);
    try {
      await fetchAdmin(`/api/admin/inventory/${trxModal.item.id}/transaction`, {
        method: "POST",
        body: JSON.stringify({
          type: trxModal.type,
          quantity: Number(trxForm.quantity),
          note: trxForm.note || undefined
        })
      });
      setTrxModal({ open: false, item: null, type: 'IN' });
      setTrxForm({ quantity: "", note: "" });
      loadItems();
    } catch (err: any) {
      alert(err.message || "Gagal mencatat transaksi");
    }
    setSubmitting(false);
  };

  const loadHistory = async (item: InventoryItem) => {
    setHistoryModal({ open: true, item });
    setLoadingHistory(true);
    try {
      const res = await fetchAdmin<{ data: InventoryTransaction[] }>(`/api/admin/inventory/${item.id}/transactions`);
      setHistory(res.data);
    } catch {
      alert("Gagal memuat riwayat");
    }
    setLoadingHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini dari daftar inventaris?")) return;
    setSubmitting(true);
    try {
      await fetchAdmin(`/api/admin/inventory/${id}`, { method: "DELETE" });
      loadItems();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus barang");
    }
    setSubmitting(false);
  };

  const filtered = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Manajemen Stok</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => { setItemForm({ name: "", unit: "", minStock: 0 }); setItemModal({ open: true, item: null }); }} className="btn btn-primary">
            <Plus size={16} /> Tambah Barang
          </button>
        </div>
        {/* Status Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20, borderLeft: "4px solid var(--primary)" }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Total Barang Terdaftar</p>
            <p className="stat-value">{items.length}</p>
          </div>
          <div className="card" style={{ padding: 20, borderLeft: "4px solid var(--error)" }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Stok Menipis / Kritis</p>
            <p className="stat-value" style={{ color: "var(--error)" }}>{items.filter(i => i.currentStock <= i.minStock).length}</p>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input 
                className="input" 
                placeholder="Cari nama barang..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: 34, width: "100%" }} 
              />
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
                    <th>Nama Barang</th>
                    <th>Stok Saat Ini</th>
                    <th>Batas Minimum</th>
                    <th>Status</th>
                    <th style={{ width: 140 }}>Mutasi Stok</th>
                    <th style={{ width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                        <PackageSearch size={40} style={{ opacity: 0.2, margin: "0 auto 10px" }} />
                        <p>Belum ada data barang.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const isCritical = item.currentStock <= item.minStock;
                      return (
                        <tr key={item.id} style={{ background: isCritical ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16 }}>
                            {item.currentStock} <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{item.unit}</span>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>{item.minStock} {item.unit}</td>
                          <td>
                            {isCritical ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--error-bg)", color: "var(--error)", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                                <AlertCircle size={14} /> Stok Kritis
                              </span>
                            ) : (
                              <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 600 }}>Aman</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setTrxModal({ open: true, item, type: 'IN' })} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12, minHeight: 30 }} title="Barang Masuk">
                                <ArrowDownCircle size={14} color="var(--success)" /> Masuk
                              </button>
                              <button onClick={() => setTrxModal({ open: true, item, type: 'OUT' })} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12, minHeight: 30 }} title="Barang Keluar">
                                <ArrowUpCircle size={14} color="var(--error)" /> Keluar
                              </button>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => loadHistory(item)} className="btn-icon btn-outline" style={{ minWidth: 32, minHeight: 32, padding: 6 }} title="Riwayat">
                                <History size={14} />
                              </button>
                              <button onClick={() => { setItemForm({ name: item.name, unit: item.unit, minStock: item.minStock }); setItemModal({ open: true, item }); }} className="btn-icon btn-outline" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="btn-icon btn-danger" style={{ minWidth: 32, minHeight: 32, padding: 6 }}>
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

      {/* Item Modal */}
      {itemModal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24, animation: "slideUp 0.2s ease" }}>
            <h2 style={{ marginBottom: 16 }}>{itemModal.item ? "Edit Barang" : "Tambah Barang Baru"}</h2>
            <form onSubmit={handleSaveItem}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">Nama Bahan/Barang</label>
                  <input type="text" className="input" placeholder="Misal: Beras Premium" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Satuan</label>
                    <input type="text" className="input" placeholder="Kg, Ltr, Pcs..." value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">Batas Minimum</label>
                    <input type="number" className="input" placeholder="0" min="0" step="0.01" value={itemForm.minStock} onChange={e => setItemForm({...itemForm, minStock: Number(e.target.value)})} required />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>Peringatan akan muncul jika stok fisik menyentuh atau di bawah Batas Minimum.</p>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setItemModal({ open: false, item: null })} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {trxModal.open && trxModal.item && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: 24, animation: "slideUp 0.2s ease" }}>
            <h2 style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              {trxModal.type === 'IN' ? <ArrowDownCircle color="var(--success)" /> : <ArrowUpCircle color="var(--error)" />}
              {trxModal.type === 'IN' ? "Barang Masuk" : "Barang Keluar"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
              Barang: <strong>{trxModal.item.name}</strong> (Stok saat ini: {trxModal.item.currentStock} {trxModal.item.unit})
            </p>
            <form onSubmit={handleSaveTrx}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">Jumlah {trxModal.type === 'IN' ? "Masuk" : "Keluar"} ({trxModal.item.unit})</label>
                  <input type="number" className="input" placeholder="0" min="0.01" step="0.01" value={trxForm.quantity} onChange={e => setTrxForm({...trxForm, quantity: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Catatan (Opsional)</label>
                  <input type="text" className="input" placeholder={trxModal.type === 'IN' ? "Pembelian dari pasar..." : "Dipakai masak..."} value={trxForm.note} onChange={e => setTrxForm({...trxForm, note: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setTrxModal({ open: false, item: null, type: 'IN' }); setTrxForm({ quantity: "", note: "" }); }} className="btn btn-outline" disabled={submitting}>Batal</button>
                <button type="submit" className={trxModal.type === 'IN' ? "btn btn-primary" : "btn btn-danger"} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : "Simpan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal.open && historyModal.item && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 600, padding: 24, animation: "slideUp 0.2s ease", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Riwayat: {historyModal.item.name}</h2>
              <button onClick={() => { setHistoryModal({ open: false, item: null }); setHistory([]); }} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}>Tutup</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
              {loadingHistory ? (
                <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Loader2 size={24} className="spin" color="var(--primary)" /></div>
              ) : history.length === 0 ? (
                <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Belum ada riwayat mutasi.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.map(tx => (
                    <div key={tx.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: tx.type === 'IN' ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)" }}>
                      <div style={{ marginTop: 2 }}>
                        {tx.type === 'IN' ? <ArrowDownCircle size={18} color="var(--success)" /> : <ArrowUpCircle size={18} color="var(--error)" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{tx.type === 'IN' ? "Masuk" : "Keluar"}: {tx.quantity} {historyModal.item?.unit}</span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatDate(tx.createdAt)}</span>
                        </div>
                        {tx.note && <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>"{tx.note}"</p>}
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Oleh: {tx.user?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
