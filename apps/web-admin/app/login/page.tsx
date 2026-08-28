"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UtensilsCrossed } from "lucide-react";
import { useAuthStore, fetchAdmin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdmin<{ data: { token: string; user: any } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setAuth(res.data.token, res.data.user);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <UtensilsCrossed size={30} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 26, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>SmartMenu</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>Admin Dashboard</p>
        </div>

        {/* Form Card */}
        <div style={{ background: "var(--surface)", borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Masuk ke Dashboard</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 22 }}>Gunakan akun admin/kasir/chef Anda</p>

          {error && (
            <div style={{ padding: "11px 14px", background: "var(--error-bg)", color: "var(--error)", borderRadius: "var(--radius-sm)", fontSize: 14, marginBottom: 16, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="admin@kafenusantara.id"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15, marginTop: 4 }} disabled={loading}>
              {loading ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Masuk…</> : "Masuk"}
            </button>
          </form>

          {/* Link to Front Page */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <a href="http://localhost:3000" style={{ color: "var(--primary)", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", padding: "8px 16px", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", transition: "all 0.2s" }}>
              ← Kembali ke Halaman Pelanggan
            </a>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
