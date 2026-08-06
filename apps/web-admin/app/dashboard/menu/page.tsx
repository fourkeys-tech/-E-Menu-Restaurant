"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Loader2, X, ImageIcon } from "lucide-react";
import Image from "next/image";
import { fetchAdmin } from "@/lib/auth";
import Pagination from "@/components/Pagination";

interface Category { id: string; name: string; slug: string; _count?: { menuItems: number }; }
interface MenuItem { id: string; name: string; price: number; imageUrl?: string; isAvailable: boolean; isBestSeller: boolean; category: { id: string; name: string }; stock?: number; variants?: any[]; }

const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function MenuItemModal({ item, categories, onClose, onSave }: { item: Partial<MenuItem> | null; categories: Category[]; onClose: () => void; onSave: (data: any) => Promise<void>; }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    categoryId: item?.category?.id || categories[0]?.id || "",
    price: item?.price?.toString() || "",
    imageUrl: item?.imageUrl || "",
    isAvailable: item?.isAvailable ?? true,
    isBestSeller: item?.isBestSeller ?? false,
    description: "",
  });
  const [variants, setVariants] = useState<any[]>(item?.variants || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, price: parseFloat(form.price), variants });
      onClose();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18 }}>{item?.id ? "Edit Menu" : "Tambah Menu"}</h2>
          <button onClick={onClose} className="btn btn-icon btn-outline"><X size={18} /></button>
        </div>

        {error && <div style={{ padding: "10px 14px", background: "var(--error-bg)", color: "var(--error)", borderRadius: "var(--radius-sm)", marginBottom: 14, fontSize: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="label">Nama Menu *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Contoh: Nasi Goreng Kampung" />
            </div>
            <div>
              <label className="label">Kategori *</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required style={{ cursor: "pointer" }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Harga (IDR) *</label>
              <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" placeholder="25000" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label className="label">URL Foto Menu</label>
              <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            {form.imageUrl && (
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ width: "100%", height: 160, borderRadius: 10, overflow: "hidden", position: "relative", background: "#f0f0ec" }}>
                  <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} onError={() => setForm({ ...form, imageUrl: "" })} />
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", gap: 24, marginTop: 10 }}>
            {[
              { key: "isAvailable", label: "Tersedia" },
              { key: "isBestSeller", label: "Best Seller" },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, [key]: !(form as any)[key] })}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: (form as any)[key] ? "var(--success)" : "var(--border)" }}
                >
                  {(form as any)[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Grup Varian Tambahan</h3>
              <button type="button" onClick={() => setVariants([...variants, { name: "", options: [{ label: "", additionalPrice: 0 }] }])} className="btn btn-sm btn-outline">
                <Plus size={14} /> Tambah Grup
              </button>
            </div>
            {variants.map((v, i) => (
              <div key={i} style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <input className="input" placeholder="Nama Grup (cth: Level Pedas, Topping)" value={v.name} onChange={e => { const nv = [...variants]; nv[i].name = e.target.value; setVariants(nv); }} required style={{ flex: 1 }} />
                  <button type="button" onClick={() => { const nv = [...variants]; nv.splice(i, 1); setVariants(nv); }} className="btn btn-icon btn-danger"><Trash2 size={16} /></button>
                </div>
                <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                  {v.options.map((opt: any, j: number) => (
                    <div key={j} style={{ display: "flex", gap: 8 }}>
                      <input className="input" placeholder="Opsi (cth: Ekstra Telur)" value={opt.label} onChange={e => { const nv = [...variants]; nv[i].options[j].label = e.target.value; setVariants(nv); }} required style={{ flex: 2, padding: "6px 10px" }} />
                      <input className="input" type="number" placeholder="Harga (+0)" value={opt.additionalPrice} onChange={e => { const nv = [...variants]; nv[i].options[j].additionalPrice = parseFloat(e.target.value) || 0; setVariants(nv); }} min="0" style={{ flex: 1, padding: "6px 10px" }} />
                      <button type="button" onClick={() => { const nv = [...variants]; nv[i].options.splice(j, 1); setVariants(nv); }} className="btn btn-icon btn-outline" style={{ padding: "6px" }}><X size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => { const nv = [...variants]; nv[i].options.push({ label: "", additionalPrice: 0 }); setVariants(nv); }} className="btn btn-sm" style={{ alignSelf: "flex-start", fontSize: 12, marginTop: 4, background: "transparent", color: "var(--info)", padding: 0 }}>
                    + Tambah Opsi
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Menyimpan…</> : "Simpan"}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<MenuItem> | null }>({ open: false, item: null });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/menu?page=${page}&limit=${limit}`;
      if (activeCategory !== "all") url += `&category=${activeCategory}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const [catRes, itemRes] = await Promise.all([
        fetchAdmin<{ data: Category[] }>("/api/admin/menu/categories"),
        fetchAdmin<{ data: MenuItem[], meta: any }>(url),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
      if (itemRes.meta) {
        setTotal(itemRes.meta.total);
        setTotalPages(itemRes.meta.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [page, limit, activeCategory, search]);

  const filteredItems = items; // API already filters

  const handleToggle = async (item: MenuItem) => {
    try {
      await fetchAdmin(`/api/admin/menu/${item.id}/toggle-availability`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini?")) return;
    try {
      await fetchAdmin(`/api/admin/menu/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  };

  const handleSave = async (data: any) => {
    if (modal.item?.id) {
      await fetchAdmin(`/api/admin/menu/${modal.item.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await fetchAdmin("/api/admin/menu", { method: "POST", body: JSON.stringify(data) });
    }
    await loadData();
  };

  return (
    <div>
      <div className="topbar">
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Manajemen Menu</h1>
      </div>

      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button onClick={() => setModal({ open: true, item: null })} className="btn btn-primary">
            <Plus size={16} /> Tambah Menu
          </button>
        </div>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input className="input" placeholder="Cari menu…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setActiveCategory("all")} className={`btn ${activeCategory === "all" ? "btn-primary" : "btn-outline"}`}>Semua</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`btn ${activeCategory === c.id ? "btn-primary" : "btn-outline"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
              <Loader2 size={28} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Status</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Tidak ada data</td></tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f0f0ec", overflow: "hidden", position: "relative", flexShrink: 0 }}>
                            {item.imageUrl ? (
                              <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: "cover" }} sizes="44px" />
                            ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={18} color="var(--text-muted)" /></div>}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                              {item.isBestSeller && <span className="badge" style={{ background: "#FEF3C7", color: "#92400E", fontSize: 10 }}>⭐ Best</span>}
                              {item.variants && item.variants.length > 0 && <span className="badge" style={{ background: "var(--info-bg)", color: "var(--info)", fontSize: 10 }}>+ {item.variants.length} Varian</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.category.name}</span></td>
                      <td><span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{formatRupiah(item.price)}</span></td>
                      <td>
                        <button onClick={() => handleToggle(item)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer" }}>
                          {item.isAvailable
                            ? <><ToggleRight size={22} color="var(--success)" /><span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>Tersedia</span></>
                            : <><ToggleLeft size={22} color="var(--text-muted)" /><span style={{ fontSize: 13, color: "var(--text-muted)" }}>Habis</span></>
                          }
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setModal({ open: true, item })} className="btn btn-sm btn-outline btn-icon"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(item.id)} className="btn btn-sm btn-danger btn-icon"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {modal.open && (
        <MenuItemModal item={modal.item} categories={categories} onClose={() => setModal({ open: false, item: null })} onSave={handleSave} />
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
