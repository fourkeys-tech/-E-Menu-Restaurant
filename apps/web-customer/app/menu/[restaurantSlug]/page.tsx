"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Search, X, Flame, Star, ChevronRight, Plus, Minus, Info } from "lucide-react";
import { api, type Category, type MenuItem, type Restaurant, formatRupiah } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart";

// ===================== Skeleton Components =====================
function SkeletonCard() {
  return (
    <div className="card overflow-hidden" style={{ display: "flex", gap: 12, padding: 12, marginBottom: 12 }}>
      <div className="skeleton" style={{ width: 100, height: 100, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 16, width: "70%" }} />
        <div className="skeleton" style={{ height: 12, width: "90%" }} />
        <div className="skeleton" style={{ height: 12, width: "60%" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div className="skeleton" style={{ height: 18, width: 80 }} />
          <div className="skeleton" style={{ height: 32, width: 32, borderRadius: "50%" }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div style={{ background: "#1A1A1A", padding: "20px 16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", background: "#333" }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 18, width: 140, marginBottom: 6, background: "#333" }} />
          <div className="skeleton" style={{ height: 13, width: 100, background: "#333" }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 44, borderRadius: 12, background: "#333" }} />
    </div>
  );
}

// ===================== Menu Item Card =====================
function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  const [imgError, setImgError] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleAdd = () => {
    if (!item.isAvailable) return;
    setPressed(true);
    onAdd(item);
    setTimeout(() => setPressed(false), 300);
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        marginBottom: 10,
        opacity: item.isAvailable ? 1 : 0.6,
        position: "relative",
      }}
    >
      {/* Image */}
      <div style={{ width: 100, height: 100, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#f0f0ec", position: "relative" }}>
        {!imgError && item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            style={{ objectFit: "cover" }}
            sizes="100px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🍽️</div>
        )}
        {!item.isAvailable && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 700, textAlign: "center" }}>HABIS</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
          {item.isBestSeller && (
            <span className="badge badge-bestseller"><Star size={10} fill="currentColor" /> Best Seller</span>
          )}
          {item.variants && item.variants.length > 0 && (
            <span className="badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>+ {item.variants.length} Varian</span>
          )}
          {!item.isAvailable && <span className="badge badge-habis">Habis</span>}
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.3, marginBottom: 4, color: "var(--text-primary)" }}>
          {item.name}
        </h3>
        {item.description && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {item.description}
          </p>
        )}
        {item.allergenInfo && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
            <Info size={10} color="var(--text-muted)" />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.allergenInfo}</span>
          </div>
        )}

        {/* Price + Add */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--primary)" }}>
            {formatRupiah(item.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={!item.isAvailable}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: item.isAvailable ? "var(--primary)" : "var(--border)",
              color: "white",
              border: "none",
              cursor: item.isAvailable ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: pressed ? "scale(0.85)" : "scale(1)",
              transition: "transform 0.2s ease",
              boxShadow: item.isAvailable ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
            }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Item Detail Modal =====================
function ItemModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (item: MenuItem, quantity: number, notes: string, variant?: any) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { label: string; additionalPrice: number }>>({});

  const totalAdditional = Object.values(selectedVariants).reduce((sum, v) => sum + v.additionalPrice, 0);
  const totalPrice = (item.price + totalAdditional) * quantity;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div
        className="animate-slide-up"
        style={{ position: "relative", background: "var(--surface)", borderRadius: "20px 20px 0 0", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div style={{ position: "relative", height: 220, background: "#f0f0ec", flexShrink: 0 }}>
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: "cover" }} sizes="480px" />
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>🍽️</div>
          )}
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} color="white" />
          </button>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, rgba(0,0,0,0.3))" }} />
        </div>

        {/* Content */}
        <div style={{ padding: "16px 16px 0", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {item.isBestSeller && <span className="badge badge-bestseller"><Star size={10} fill="currentColor" /> Best Seller</span>}
            {item.variants && item.variants.length > 0 && <span className="badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>+ {item.variants.length} Varian</span>}
          </div>
          <h2 style={{ fontSize: 20, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>{item.name}</h2>
          {item.description && <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{item.description}</p>}

          {/* Variants */}
          {item.variants?.map((variant) => (
            <div key={variant.name} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>{variant.name}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {variant.options.map((opt) => {
                  const isSelected = selectedVariants[variant.name]?.label === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedVariants((prev) => ({ ...prev, [variant.name]: opt }))}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 100,
                        fontSize: 13,
                        fontWeight: 500,
                        border: isSelected ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                        background: isSelected ? "var(--primary)" : "white",
                        color: isSelected ? "white" : "var(--text-primary)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}{opt.additionalPrice > 0 && ` +${formatRupiah(opt.additionalPrice)}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Catatan Khusus</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: tidak pedas, tanpa bawang…"
              rows={2}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ padding: 16, borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Minus size={16} />
              </button>
              <span style={{ fontSize: 18, fontWeight: 700, width: 24, textAlign: "center" }}>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={16} color="white" />
              </button>
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18 }}>{formatRupiah(totalPrice)}</span>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => {
              onAdd(item, quantity, notes, Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined);
              onClose();
            }}
          >
            <ShoppingCart size={18} /> Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== Floating Cart Bar =====================
function FloatingCartBar({ restaurantSlug }: { restaurantSlug: string }) {
  const { items, getTotal, getItemCount } = useCartStore();
  const count = getItemCount();

  if (count === 0) return null;

  return (
    <div
      className="animate-slide-up"
      style={{ position: "fixed", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 50, pointerEvents: "none" }}
    >
      <Link
        href={`/menu/${restaurantSlug}/cart`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "var(--primary)",
          borderRadius: 16,
          textDecoration: "none",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          color: "white",
          width: "calc(100% - 32px)",
          maxWidth: 448,
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <ShoppingCart size={22} color="white" />
            <span style={{ position: "absolute", top: -8, right: -8, background: "var(--accent)", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {count}
            </span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Lihat Keranjang ({count} item)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{formatRupiah(getTotal())}</span>
          <ChevronRight size={18} />
        </div>
      </Link>
    </div>
  );
}

// ===================== Main Page =====================
export default function MenuPage(props: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ table?: string; category?: string }> }) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const { restaurantSlug } = params;
  const tableId = searchParams.table;

  const [data, setData] = useState<{ restaurant: Restaurant; categories: Category[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState("");

  const { addItem, setTable, setRestaurant, tableId: currentTableId, clearCart } = useCartStore();
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableId) {
      if (currentTableId && currentTableId !== tableId) {
        clearCart();
      }
      setTable(tableId);
    }
    setRestaurant(restaurantSlug);
  }, [tableId, restaurantSlug, currentTableId, clearCart, setTable, setRestaurant]);

  useEffect(() => {
    const load = async () => {
      try {
        if (tableId) {
          const status = await api.getTableStatus(restaurantSlug, tableId);
          if (status.isOccupied) {
            setIsTableOccupied(true);
            setLoading(false);
            return;
          }
          if (status.tableNumber) setTableNumber(status.tableNumber);
        }

        const result = await api.getMenu(restaurantSlug);
        setData(result);
        setActiveCategory("all");
      } catch (e: any) {
        setError(e.message || "Gagal memuat menu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantSlug, tableId]);

  const filteredCategories = data?.categories.map((cat) => ({
    ...cat,
    menuItems: cat.menuItems.filter((item) =>
      searchQuery ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    ),
  })).filter((cat) => cat.menuItems.length > 0)
    .filter((cat) => (searchQuery || activeCategory === "all") ? true : cat.slug === activeCategory) || [];

  const handleTabClick = (slug: string) => {
    setActiveCategory(slug);
    
    // Scroll tab into view
    const tabEl = tabsRef.current?.querySelector(`[data-slug="${slug}"]`) as HTMLElement;
    tabEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    
    // Scroll to top of the menu items
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const handleAddItem = (item: MenuItem, quantity = 1, notes = "", variantSelected?: any) => {
    const variantsArr = variantSelected
      ? Object.entries(variantSelected).map(([key, val]) => ({ name: key, selectedOption: val as any }))
      : undefined;

    const totalAdditional = variantsArr?.reduce((sum, v) => sum + (v.selectedOption.additionalPrice || 0), 0) || 0;
    const price = item.price + totalAdditional;

    addItem({ menuItemId: item.id, name: item.name, price, imageUrl: item.imageUrl, quantity, notes, variantSelected: variantsArr });
    setToast(`${item.name} ditambahkan! 🎉`);
    setTimeout(() => setToast(""), 2500);
  };

  const r = data?.restaurant;

  if (loading) {
    return (
      <div>
        <SkeletonHeader />
        <div style={{ padding: "16px 16px 0" }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (isTableOccupied) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, textAlign: "center", background: "#111", color: "white" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(239,68,64,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Meja Sedang Digunakan</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 32 }}>
          Meja ini masih memiliki pesanan aktif yang belum diselesaikan pembayarannya. <br/><br/>
          Silakan selesaikan pembayaran pesanan sebelumnya di kasir, atau hubungi pelayan jika ini adalah sebuah kesalahan.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
        <h2 style={{ fontSize: 20, marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Menu Tidak Ditemukan</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{error || "Restoran tidak tersedia"}</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: r!.primaryColor || "#1A1A1A", padding: "20px 16px 16px", position: "sticky", top: 0, zIndex: 40 }}>
        {/* Restaurant info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {r!.logoUrl ? (
              <Image src={r!.logoUrl} alt={r!.name} width={44} height={44} style={{ objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 22 }}>🍽️</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ color: "white", fontSize: 17, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r!.name}
              </h1>
              {tableNumber && (
                <div style={{ 
                  background: r!.accentColor || "var(--accent)", 
                  color: "white", 
                  padding: "2px 8px", 
                  borderRadius: 20, 
                  fontSize: 11, 
                  fontWeight: 600 
                }}>
                  Meja {tableNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={16} color="rgba(255,255,255,0.5)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu…"
            style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.12)", color: "white", fontSize: 14, outline: "none" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} color="rgba(255,255,255,0.5)" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div
            ref={tabsRef}
            style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 12, scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              data-slug="all"
              onClick={() => handleTabClick("all")}
              style={{
                padding: "6px 16px",
                borderRadius: 100,
                border: "none",
                background: activeCategory === "all" ? (r!.accentColor || "#D9A441") : "rgba(255,255,255,0.12)",
                color: activeCategory === "all" ? "white" : "rgba(255,255,255,0.7)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              Semua
            </button>
            {data.categories.map((cat) => (
              <button
                key={cat.id}
                data-slug={cat.slug}
                onClick={() => handleTabClick(cat.slug)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 100,
                  border: "none",
                  background: activeCategory === cat.slug ? (r!.accentColor || "#D9A441") : "rgba(255,255,255,0.12)",
                  color: activeCategory === cat.slug ? "white" : "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div style={{ padding: "12px 16px 0" }}>
        {filteredCategories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 16px" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Menu tidak ditemukan</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Coba kata kunci lain</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} data-category={cat.slug}>
              <h2 style={{ fontSize: 17, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: 12, marginTop: 16, paddingBottom: 8, borderBottom: "2px solid var(--border)" }}>
                {cat.name}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginLeft: 8 }}>({cat.menuItems.length})</span>
              </h2>
              {cat.menuItems.map((item) => (
                <div key={item.id} onClick={() => { if (item.isAvailable) setSelectedItem(item); }} style={{ cursor: item.isAvailable ? 'pointer' : 'not-allowed' }}>
                  <MenuItemCard
                    item={item}
                    onAdd={(item) => setSelectedItem(item)}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Floating Cart */}
      <FloatingCartBar restaurantSlug={restaurantSlug} />

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={handleAddItem}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 100, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}>
          <div
            className="animate-slide-up"
            style={{ background: "#1A1A1A", color: "white", padding: "10px 20px", borderRadius: 100, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
          >
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
