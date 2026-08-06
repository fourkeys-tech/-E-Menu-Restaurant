"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, FileText } from "lucide-react";
import { useCartStore, CartItem, getVariantKey } from "@/lib/store/cart";
import { formatRupiah } from "@/lib/api";

function CartItemRow({ item, onUpdate, onRemove }: { item: CartItem; onUpdate: (q: number) => void; onRemove: () => void }) {
  return (
    <div className="animate-fade-in" style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      {/* Image */}
      <div style={{ width: 68, height: 68, borderRadius: 12, overflow: "hidden", background: "#f0f0ec", position: "relative", flexShrink: 0 }}>
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill style={{ objectFit: "cover" }} sizes="68px" />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🍽️</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </h4>
        {item.variantSelected && item.variantSelected.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
            {item.variantSelected.map((v, i) => (
              <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {v.name}: {v.selectedOption.label}
              </p>
            ))}
          </div>
        )}
        {item.notes && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <FileText size={11} color="var(--text-muted)" />
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.notes}
            </p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: "var(--primary)" }}>
            {formatRupiah(item.subtotal)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onRemove}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #fecaca", background: "#fff5f5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Trash2 size={14} color="#ef4444" />
            </button>
            <button onClick={() => onUpdate(item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Minus size={14} />
            </button>
            <span style={{ width: 22, textAlign: "center", fontWeight: 700, fontSize: 15 }}>{item.quantity}</span>
            <button onClick={() => onUpdate(item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={14} color="white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = use(props.params);
  const { restaurantSlug } = params;
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [orderNotes, setOrderNotes] = useState("");

  const subtotal = getTotal();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <ShoppingBag size={64} color="var(--border)" style={{ marginBottom: 20 }} />
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, marginBottom: 10 }}>Keranjang Kosong</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 28 }}>Belum ada item yang dipilih.</p>
        <Link href={`/menu/${restaurantSlug}`} className="btn btn-primary">Lihat Menu</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30 }}>
        <Link href={`/menu/${restaurantSlug}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--border)", color: "var(--primary)" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Keranjang</h1>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>{items.length} item</span>
      </div>

      {/* Items */}
      <div style={{ padding: "0 16px", background: "var(--surface)" }}>
        {items.map((item) => {
          const vKey = getVariantKey(item.variantSelected);
          return (
            <CartItemRow
              key={`${item.menuItemId}-${vKey}`}
              item={item}
              onUpdate={(q) => updateQuantity(item.menuItemId, q, vKey)}
              onRemove={() => removeItem(item.menuItemId, vKey)}
            />
          );
        })}
      </div>

      {/* Order Notes */}
      <div style={{ margin: "12px 16px", padding: 16, background: "var(--surface)", borderRadius: "var(--radius)" }}>
        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Catatan Pesanan
        </label>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Catatan untuk seluruh pesanan (opsional)…"
          rows={2}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", color: "var(--text-primary)" }}
        />
      </div>

      {/* Summary */}
      <div style={{ margin: "0 16px 12px", padding: 16, background: "var(--surface)", borderRadius: "var(--radius)" }}>
        <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Ringkasan Pesanan</h3>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Subtotal</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Pajak (10%)</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(tax)}</span>
        </div>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>{formatRupiah(total)}</span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "12px 16px", background: "white", borderTop: "1px solid var(--border)" }}>
        <button
          className="btn btn-primary"
          style={{ width: "100%", fontSize: 16 }}
          onClick={() => router.push(`/menu/${restaurantSlug}/checkout`)}
        >
          Lanjut ke Pembayaran — {formatRupiah(total)}
        </button>
      </div>
    </div>
  );
}
