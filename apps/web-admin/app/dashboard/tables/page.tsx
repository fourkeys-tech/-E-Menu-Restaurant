"use client";

import { useState, useEffect } from "react";
import { Plus, QrCode, Trash2, Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { fetchAdmin } from "@/lib/auth";
import Pagination from "@/components/Pagination";

interface Table { id: string; tableNumber: string; label?: string; capacity: number; isActive: boolean; qrCodeUrl?: string; _count?: { orders: number }; }

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tableNumber: "", label: "", capacity: "4" });
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; table: Table | null; data: any }>({ open: false, table: null, data: null });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin<{ data: Table[], meta: any }>(`/api/admin/tables?page=${page}&limit=${limit}`);
      setTables(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadTables(); }, [page, limit]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchAdmin<{ data: Table }>("/api/admin/tables", { method: "POST", body: JSON.stringify({ ...form, capacity: parseInt(form.capacity) }) });
      setForm({ tableNumber: "", label: "", capacity: "4" });
      await loadTables();
      
      // Tampilkan QR Code secara otomatis setelah dibuat
      if (res.data) {
        handleGetQR(res.data);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleGetQR = async (table: Table) => {
    try {
      const res = await fetchAdmin<{ data: any }>(`/api/admin/tables/${table.id}/qrcode`);
      setQrModal({ open: true, table, data: res.data });
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus meja ini?")) return;
    try {
      await fetchAdmin(`/api/admin/tables/${id}`, { method: "DELETE" });
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch { /* ignore */ }
  };

  const downloadQR = (dataUrl: string, tableNumber: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-Meja-${tableNumber}.png`;
    a.click();
  };

  const printQR = (dataUrl: string, tableNumber: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR - Meja ${tableNumber}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            img { width: 300px; height: 300px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0; }
          </style>
        </head>
        <body>
          <h1>Meja ${tableNumber}</h1>
          <img src="${dataUrl}" />
          <p>Scan untuk memesan</p>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Meja & QR Code</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
          {/* Add Table Form */}
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Tambah Meja Baru</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Nomor Meja *</label>
                <input className="input" value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: e.target.value })} placeholder="1, 2, VIP-1, …" required />
              </div>
              <div>
                <label className="label">Label (Opsional)</label>
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Misal: Pojok Kanan" />
              </div>
              <div>
                <label className="label">Kapasitas</label>
                <input className="input" type="number" min="1" max="20" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 4 }}>
                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
                {saving ? "Membuat…" : "Buat Meja & QR"}
              </button>
            </form>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.5 }}>
              QR Code otomatis dibuat saat meja ditambahkan. Pelanggan scan QR untuk melihat menu.
            </p>
          </div>

          {/* Tables Grid */}
          <div>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Loader2 size={28} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {tables.map((table) => (
                  <div key={table.id} className="card animate-fade-in" style={{ padding: 16, textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: "var(--surface-2)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {table.qrCodeUrl ? (
                        <img src={table.qrCodeUrl} alt="QR" style={{ width: 50, height: 50, borderRadius: 8 }} />
                      ) : (
                        <QrCode size={28} color="var(--text-muted)" />
                      )}
                    </div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                      Meja {table.tableNumber}
                    </p>
                    {table.label && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{table.label}</p>}
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>👥 {table.capacity} orang</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleGetQR(table)} className="btn btn-sm btn-outline" style={{ flex: 1 }}>
                        <QrCode size={13} /> QR
                      </button>
                      <button onClick={() => handleDelete(table.id)} className="btn btn-sm btn-danger btn-icon">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <Pagination 
                      page={page} 
                      limit={limit} 
                      total={total} 
                      totalPages={totalPages} 
                      onPageChange={setPage} 
                      onLimitChange={(l) => { setLimit(l); setPage(1); }} 
                    />
                  </div>
                </>
              )}
            </div>
        </div>
      </div>

      {/* QR Modal */}
      {qrModal.open && qrModal.data && (
        <div className="modal-overlay animate-fade-in" onClick={() => setQrModal({ open: false, table: null, data: null })}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, textAlign: "center" }}>
            <h2 style={{ marginBottom: 4 }}>QR Code — Meja {qrModal.table?.tableNumber}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Scan untuk membuka menu</p>
            <img src={qrModal.data.qrCodeDataUrl} alt="QR Code" style={{ width: "100%", maxWidth: 240, margin: "0 auto 16px", display: "block", borderRadius: 12 }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all", marginBottom: 16 }}>{qrModal.data.menuUrl}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setQrModal({ open: false, table: null, data: null })} className="btn btn-outline" style={{ flex: 1, minWidth: "100%" }}>Tutup</button>
              <button onClick={() => downloadQR(qrModal.data.qrCodeDataUrl, qrModal.table!.tableNumber)} className="btn btn-primary" style={{ flex: 1, minWidth: "48%" }}>
                <Download size={15} /> Unduh
              </button>
              <button onClick={() => printQR(qrModal.data.qrCodeDataUrl, qrModal.table!.tableNumber)} className="btn btn-accent" style={{ flex: 1, minWidth: "48%" }}>
                <QrCode size={15} /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
