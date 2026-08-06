"use client";

import { useEffect, useState } from "react";
import { useAuthStore, fetchAdmin } from "@/lib/auth";
import { Loader2, Save, User as UserIcon, Store, Palette, Shield, Building2, Paintbrush, Receipt } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "restaurant" | "device">("profile");

  // Profile Form State
  const [profileForm, setProfileForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });

  // Restaurant Form State
  const [restaurantForm, setRestaurantForm] = useState({
    name: "", address: "", phone: "", email: "", logoUrl: "", description: "",
    taxPercentage: 0, serviceCharge: 0, primaryColor: "", accentColor: "",
  });
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [restaurantMessage, setRestaurantMessage] = useState({ type: "", text: "" });
  const [initialLoad, setInitialLoad] = useState(true);

  // Device Form State
  const [receiptWidth, setReceiptWidth] = useState("80mm");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profileRes = await fetchAdmin<{ success: boolean; data: any }>("/api/admin/settings/profile");
        if (profileRes.success) {
          setProfileForm({ name: profileRes.data.name || "", email: profileRes.data.email || "", password: "", confirmPassword: "" });
        }
        if (user?.role === "admin") {
          const restRes = await fetchAdmin<{ success: boolean; data: any }>("/api/admin/settings/restaurant");
          if (restRes.success) {
            setRestaurantForm({
              name: restRes.data.name || "", address: restRes.data.address || "", phone: restRes.data.phone || "",
              email: restRes.data.email || "", logoUrl: restRes.data.logoUrl || "", description: restRes.data.description || "",
              taxPercentage: restRes.data.taxPercentage || 0, serviceCharge: restRes.data.serviceCharge || 0,
              primaryColor: restRes.data.primaryColor || "#1A1A1A", accentColor: restRes.data.accentColor || "#D9A441",
            });
          }
        }
        setReceiptWidth(localStorage.getItem("receiptWidth") || "80mm");
      } catch (err: any) { console.error("Failed to load settings:", err); }
      finally { setInitialLoad(false); }
    };
    loadSettings();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: "", text: "" });
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileMessage({ type: "error", text: "Kata sandi dan konfirmasi tidak cocok" });
      return;
    }
    try {
      setProfileLoading(true);
      const payload: any = { name: profileForm.name, email: profileForm.email };
      if (profileForm.password) payload.password = profileForm.password;
      const res = await fetchAdmin<{ success: boolean; message: string }>("/api/admin/settings/profile", { method: "PUT", body: JSON.stringify(payload) });
      if (res.success) {
        setProfileMessage({ type: "success", text: res.message });
        setProfileForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      }
    } catch (err: any) { setProfileMessage({ type: "error", text: err.message || "Gagal memperbarui profil" }); }
    finally { setProfileLoading(false); }
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestaurantMessage({ type: "", text: "" });
    try {
      setRestaurantLoading(true);
      const res = await fetchAdmin<{ success: boolean; message: string }>("/api/admin/settings/restaurant", { method: "PUT", body: JSON.stringify(restaurantForm) });
      if (res.success) setRestaurantMessage({ type: "success", text: res.message });
    } catch (err: any) { setRestaurantMessage({ type: "error", text: err.message || "Gagal memperbarui pengaturan restoran" }); }
    finally { setRestaurantLoading(false); }
  };

  if (initialLoad) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={32} className="spin" color="var(--primary)" /></div>;
  }

  return (
    <div>
      <div className="topbar">
        <h1 style={{ flex: 1, fontSize: 20 }}>Pengaturan Sistem</h1>
      </div>

      <div className="page-content" style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        
        {/* Custom Segmented Tabs */}
        <div style={{ display: "inline-flex", background: "var(--surface-2)", padding: 6, borderRadius: 12, marginBottom: 24, border: "1px solid var(--border)" }}>
          <button onClick={() => setActiveTab("profile")} style={{ padding: "8px 20px", border: "none", background: activeTab === "profile" ? "var(--surface)" : "transparent", color: activeTab === "profile" ? "var(--primary)" : "var(--text-secondary)", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: activeTab === "profile" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}>
            <UserIcon size={16} /> Profil Pribadi
          </button>
          {user?.role === "admin" && (
            <button onClick={() => setActiveTab("restaurant")} style={{ padding: "8px 20px", border: "none", background: activeTab === "restaurant" ? "var(--surface)" : "transparent", color: activeTab === "restaurant" ? "var(--primary)" : "var(--text-secondary)", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: activeTab === "restaurant" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}>
              <Store size={16} /> Data Restoran
            </button>
          )}
          <button onClick={() => setActiveTab("device")} style={{ padding: "8px 20px", border: "none", background: activeTab === "device" ? "var(--surface)" : "transparent", color: activeTab === "device" ? "var(--primary)" : "var(--text-secondary)", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: activeTab === "device" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }}>
            <Receipt size={16} /> Preferensi Perangkat
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="card animate-fade-in" style={{ padding: "30px 40px" }}>
            <form onSubmit={handleProfileSubmit}>
              <div style={{ marginBottom: 30, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}><UserIcon size={24} color="var(--primary)" /></div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Informasi Dasar</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Perbarui nama tampilan dan alamat email Anda.</p>
                </div>
              </div>

              {profileMessage.text && (
                <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14, display: "flex", alignItems: "center", gap: 8, backgroundColor: profileMessage.type === "success" ? "var(--success-bg)" : "var(--error-bg)", color: profileMessage.type === "success" ? "var(--success)" : "var(--error)", border: `1px solid ${profileMessage.type === "success" ? "#86efac" : "#fca5a5"}` }}>
                  {profileMessage.text}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input type="text" required className="input" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Alamat Email</label>
                  <input type="email" required className="input" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: 40, marginBottom: 30, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}><Shield size={24} color="var(--primary)" /></div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Keamanan Akun</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ubah kata sandi login Anda secara berkala demi keamanan.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
                <div>
                  <label className="label">Kata Sandi Baru</label>
                  <input type="password" placeholder="Kosongkan jika tidak diubah" className="input" value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">Ulangi Kata Sandi Baru</label>
                  <input type="password" placeholder="Tulis ulang sandi baru" className="input" value={profileForm.confirmPassword} onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button disabled={profileLoading} type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }}>
                  {profileLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "restaurant" && user?.role === "admin" && (
          <div className="card animate-fade-in" style={{ padding: "30px 40px" }}>
            <form onSubmit={handleRestaurantSubmit}>
              
              {restaurantMessage.text && (
                <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14, display: "flex", alignItems: "center", gap: 8, backgroundColor: restaurantMessage.type === "success" ? "var(--success-bg)" : "var(--error-bg)", color: restaurantMessage.type === "success" ? "var(--success)" : "var(--error)", border: `1px solid ${restaurantMessage.type === "success" ? "#86efac" : "#fca5a5"}` }}>
                  {restaurantMessage.text}
                </div>
              )}

              {/* Restoran Info Section */}
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}><Building2 size={24} color="var(--primary)" /></div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Identitas Usaha</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Data ini mungkin ditampilkan pada struk atau halaman pelanggan.</p>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
                <div>
                  <label className="label">Nama Usaha / Restoran</label>
                  <input type="text" required className="input" value={restaurantForm.name} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Nomor Telepon</label>
                  <input type="text" className="input" value={restaurantForm.phone} onChange={e => setRestaurantForm({ ...restaurantForm, phone: e.target.value })} placeholder="Cth: 08123456789" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Alamat Lengkap</label>
                  <textarea rows={2} className="input" style={{ resize: "vertical" }} value={restaurantForm.address} onChange={e => setRestaurantForm({ ...restaurantForm, address: e.target.value })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">URL Logo Gambar (Opsional)</label>
                  <input type="url" className="input" value={restaurantForm.logoUrl} onChange={e => setRestaurantForm({ ...restaurantForm, logoUrl: e.target.value })} placeholder="https://contoh.com/gambar-logo.png" />
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Masukkan link gambar publik (PNG/JPG) untuk logo kafe Anda.</p>
                </div>
              </div>

              {/* Pajak & Biaya Section */}
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}><Receipt size={24} color="var(--primary)" /></div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Pajak & Biaya Layanan</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sistem akan otomatis menghitung tarif ini pada total pesanan.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 600, marginBottom: 40 }}>
                <div>
                  <label className="label">Pajak Pertambahan Nilai (PPN)</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" step="0.1" required className="input" style={{ paddingRight: 40 }} value={restaurantForm.taxPercentage} onChange={e => setRestaurantForm({ ...restaurantForm, taxPercentage: parseFloat(e.target.value) || 0 })} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontWeight: 600 }}>%</span>
                  </div>
                </div>
                <div>
                  <label className="label">Service Charge (Biaya Layanan)</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" step="0.1" required className="input" style={{ paddingRight: 40 }} value={restaurantForm.serviceCharge} onChange={e => setRestaurantForm({ ...restaurantForm, serviceCharge: parseFloat(e.target.value) || 0 })} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontWeight: 600 }}>%</span>
                  </div>
                </div>
              </div>

              {/* Visuals Section */}
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                <div style={{ padding: 10, background: "var(--surface-2)", borderRadius: 10 }}><Paintbrush size={24} color="var(--primary)" /></div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Penyesuaian Visual</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Atur warna dominan yang akan ditampilkan pada halaman Menu Pelanggan.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 600, marginBottom: 20 }}>
                <div>
                  <label className="label">Warna Utama (Primary)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="color" value={restaurantForm.primaryColor} onChange={e => setRestaurantForm({ ...restaurantForm, primaryColor: e.target.value })} style={{ height: 42, width: 50, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 8, padding: 0 }} />
                    <input type="text" className="input" value={restaurantForm.primaryColor} onChange={e => setRestaurantForm({ ...restaurantForm, primaryColor: e.target.value })} style={{ fontFamily: "monospace", textTransform: "uppercase" }} />
                  </div>
                </div>
                <div>
                  <label className="label">Warna Aksen (Accent)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="color" value={restaurantForm.accentColor} onChange={e => setRestaurantForm({ ...restaurantForm, accentColor: e.target.value })} style={{ height: 42, width: 50, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 8, padding: 0 }} />
                    <input type="text" className="input" value={restaurantForm.accentColor} onChange={e => setRestaurantForm({ ...restaurantForm, accentColor: e.target.value })} style={{ fontFamily: "monospace", textTransform: "uppercase" }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button disabled={restaurantLoading} type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }}>
                  {restaurantLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Preferensi Perangkat */}
        {activeTab === "device" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(217, 164, 65, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Receipt size={20} color="var(--primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Pengaturan Printer Kasir</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pengaturan ini hanya tersimpan di perangkat (browser) yang sedang Anda gunakan saat ini.</p>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Ukuran Kertas Struk (Thermal Printer)</label>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 8, background: receiptWidth === "58mm" ? "var(--surface-2)" : "transparent" }}>
                    <input type="radio" name="receiptWidth" value="58mm" checked={receiptWidth === "58mm"} onChange={(e) => setReceiptWidth(e.target.value)} />
                    <span style={{ fontWeight: 600 }}>58mm (Kecil)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 8, background: receiptWidth === "80mm" ? "var(--surface-2)" : "transparent" }}>
                    <input type="radio" name="receiptWidth" value="80mm" checked={receiptWidth === "80mm"} onChange={(e) => setReceiptWidth(e.target.value)} />
                    <span style={{ fontWeight: 600 }}>80mm (Standar Lebar)</span>
                  </label>
                </div>
              </div>

              <button 
                className="btn btn-primary"
                onClick={() => {
                  localStorage.setItem("receiptWidth", receiptWidth);
                  alert("Preferensi printer berhasil disimpan di perangkat ini.");
                }}
              >
                <Save size={18} /> Simpan Preferensi
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
