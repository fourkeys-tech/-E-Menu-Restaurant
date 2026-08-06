"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, CreditCard, Wallet, CheckCircle, Loader2, Store } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { api, formatRupiah } from "@/lib/api";

export default function CheckoutPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = use(props.params);
  const { restaurantSlug } = params;
  const router = useRouter();
  const { items, tableId, getTotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<"midtrans" | "cashier" | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = getTotal();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!paymentMethod) return;
    setLoading(true);
    setError("");

    try {
      const order = await api.createOrder({
        restaurantSlug,
        tableId,
        paymentMethod,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        promoCode: promoCode || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
          variantSelected: i.variantSelected,
        })),
      });

      clearCart();

      if (paymentMethod === "midtrans" && order.payment?.snapToken) {
        // Load Midtrans Snap
        const snap = (window as any).snap;
        if (snap) {
          snap.pay(order.payment.snapToken, {
            onSuccess: () => router.push(`/menu/${restaurantSlug}/tracking/${order.id}`),
            onPending: () => router.push(`/menu/${restaurantSlug}/tracking/${order.id}`),
            onError: () => setError("Pembayaran gagal. Silakan coba lagi."),
            onClose: () => router.push(`/menu/${restaurantSlug}/tracking/${order.id}`),
          });
        } else {
          // Fallback: redirect to tracking
          router.push(`/menu/${restaurantSlug}/tracking/${order.id}`);
        }
      } else {
        router.push(`/menu/${restaurantSlug}/tracking/${order.id}`);
      }
    } catch (e: any) {
      setError(e.message || "Gagal membuat pesanan");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 120 }}>
      {/* Midtrans Snap script */}
      <script
        src={`https://app.sandbox.midtrans.com/snap/snap.js`}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        async
      />

      {/* Header */}
      <div style={{ background: "var(--surface)", padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30 }}>
        <Link href={`/menu/${restaurantSlug}/cart`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--border)", color: "var(--primary)" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700 }}>Pilih Pembayaran</h1>
      </div>

      <div style={{ padding: 16 }}>
        {/* Order summary mini */}
        <div style={{ padding: "14px 16px", background: "var(--surface)", borderRadius: "var(--radius)", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{items.length} item</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18 }}>{formatRupiah(total)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Pajak 10%</p>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{formatRupiah(tax)}</p>
          </div>
        </div>

        {/* Data Pelanggan */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Data Pemesan</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Nama Panggilan (Opsional)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Contoh: Budi" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Nomor WhatsApp (Untuk Poin/Promo)</label>
              <input 
                type="tel" 
                className="input" 
                placeholder="08..." 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Kode Promo (Bila ada)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="MakanHemat" 
                value={promoCode} 
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}
              />
            </div>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Metode Pembayaran</h2>

        {/* Option 1: Midtrans */}
        <button
          onClick={() => setPaymentMethod("midtrans")}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: "var(--radius)",
            border: paymentMethod === "midtrans" ? "2px solid var(--primary)" : "2px solid var(--border)",
            background: paymentMethod === "midtrans" ? "#f5f5f3" : "var(--surface)",
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 12,
            transition: "all 0.2s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <QrCode size={22} color="white" />
              </div>
              <div>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Bayar Sekarang</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>QRIS, GoPay, OVO, ShopeePay, VA</p>
              </div>
            </div>
            <span style={{ background: "#D1FAE5", color: "#065F46", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>Instan</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["QRIS", "GoPay", "OVO", "Dana"].map((m) => (
              <span key={m} style={{ background: "#f0f0ec", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{m}</span>
            ))}
          </div>
          {paymentMethod === "midtrans" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={16} color="var(--primary)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>Dipilih</span>
            </div>
          )}
        </button>

        {/* Option 2: Bayar di Kasir */}
        <button
          onClick={() => setPaymentMethod("cashier")}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: "var(--radius)",
            border: paymentMethod === "cashier" ? "2px solid var(--primary)" : "2px solid var(--border)",
            background: paymentMethod === "cashier" ? "#f5f5f3" : "var(--surface)",
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 24,
            transition: "all 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#D9A441", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Store size={22} color="white" />
            </div>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Bayar di Kasir</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cash / EDC / Kartu Debit</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Pesanan langsung masuk ke dapur. Tunjukkan nomor pesanan ke kasir saat ingin membayar.
          </p>
          {paymentMethod === "cashier" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={16} color="var(--primary)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>Dipilih</span>
            </div>
          )}
        </button>

        {error && (
          <div style={{ padding: "12px 16px", background: "#FEF2F2", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#DC2626", fontSize: 14 }}>{error}</span>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "12px 16px", background: "white", borderTop: "1px solid var(--border)" }}>
        <button
          className="btn btn-primary"
          style={{ width: "100%", fontSize: 16, opacity: !paymentMethod || loading ? 0.5 : 1 }}
          disabled={!paymentMethod || loading}
          onClick={handleCheckout}
        >
          {loading ? (
            <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Memproses…</>
          ) : (
            `Pesan Sekarang — ${formatRupiah(total)}`
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
