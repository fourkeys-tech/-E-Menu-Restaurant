"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Table2,
  BarChart3, LogOut, ChefHat, Settings, Users, Wallet, Bookmark, ChevronDown, ChevronRight, PackageSearch, Tag
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

const NAV_GROUPS = [
  {
    group: "Utama",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "kasir", "chef"] },
      { href: "/dashboard/orders", icon: ClipboardList, label: "Pesanan", roles: ["admin", "kasir", "chef"] },
      { href: "/kds", icon: ChefHat, label: "Kitchen Display", roles: ["kasir", "chef"] },
    ]
  },
  {
    group: "Restoran",
    items: [
      { href: "/dashboard/menu", icon: UtensilsCrossed, label: "Menu", roles: ["admin"] },
      { href: "/dashboard/tables", icon: Table2, label: "Meja & QR Code", roles: ["admin"] },
      { href: "/dashboard/promotions", icon: Tag, label: "Promo & Diskon", roles: ["admin"] },
      { href: "/dashboard/reservations", icon: Bookmark, label: "Reservasi Meja", roles: ["admin", "kasir"] },
    ]
  },
  {
    group: "Logistik & Keuangan",
    items: [
      { href: "/dashboard/inventory", icon: PackageSearch, label: "Manajemen Stok", roles: ["admin", "chef"] },
      { 
        label: "Pengeluaran", 
        icon: Wallet, 
        roles: ["admin"],
        subItems: [
          { href: "/dashboard/expenses/categories", label: "Kategori Pengeluaran", roles: ["admin"] },
          { href: "/dashboard/expenses", label: "Daftar Pengeluaran", roles: ["admin"] }
        ]
      },
    ]
  },
  {
    group: "SDM & Data",
    items: [
      { href: "/dashboard/users", icon: Users, label: "Karyawan", roles: ["admin"] },
      { href: "/dashboard/customers", icon: Users, label: "Pelanggan", roles: ["admin"] },
      { href: "/dashboard/shifts", icon: ClipboardList, label: "Riwayat Shift", roles: ["admin"] },
    ]
  },
  {
    group: "Laporan & Sistem",
    items: [
      { href: "/dashboard/activity", icon: ClipboardList, label: "Log Aktivitas", roles: ["admin"] },
      { href: "/dashboard/reports", icon: BarChart3, label: "Laporan", roles: ["admin"] },
      { href: "/dashboard/settings", icon: Settings, label: "Pengaturan", roles: ["admin", "kasir", "chef"] },
    ]
  }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout, shiftActive } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ "Pengeluaran": pathname.startsWith("/dashboard/expenses") });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!token) {
        router.push("/login");
      }
    }
  }, [token, isHydrated, user, pathname, router]);

  const showShiftWarning = user?.role === "kasir" && !shiftActive && pathname !== "/dashboard" && pathname !== "/dashboard/settings";

  if (!isHydrated || !token || !user) return null;

  if (!isHydrated || !token || !user) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UtensilsCrossed size={20} color="white" />
            </div>
            <div>
              <p style={{ color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15 }}>SmartMenu</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{user.restaurant?.name || "Admin"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} style={{ marginBottom: 16 }}>
                <p style={{ 
                  color: "rgba(255,255,255,0.4)", 
                  fontSize: 10, 
                  fontWeight: 700, 
                  textTransform: "uppercase", 
                  letterSpacing: 1, 
                  padding: "0 24px", 
                  marginBottom: 8 
                }}>
                  {group.group}
                </p>
                {visibleItems.map((item: any) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  
                  if (hasSubItems) {
                    const isOpen = openMenus[item.label];
                    const isAnySubActive = item.subItems.some((sub: any) => pathname === sub.href || pathname.startsWith(sub.href + (sub.href === "/dashboard/expenses" ? "" : "/")));
                    
                    return (
                      <div key={item.label}>
                        <div 
                          className={`nav-item ${isAnySubActive && !isOpen ? "active" : ""}`} 
                          style={{ position: "relative", cursor: "pointer", justifyContent: "space-between" }}
                          onClick={() => setOpenMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <Icon size={18} />
                            <span>{item.label}</span>
                          </div>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        
                        {isOpen && (
                          <div style={{ paddingLeft: 24, marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                            {item.subItems.map((sub: any) => {
                              if (!sub.roles.includes(user.role)) return null;
                              // Strict exact match for submenu to avoid overlapping active states for /expenses and /expenses/categories
                              const isSubActive = pathname === sub.href;
                              return (
                                <Link key={sub.href} href={sub.href}>
                                  <div className={`nav-item ${isSubActive ? "active" : ""}`} style={{ padding: "8px 12px", fontSize: 13, minHeight: "auto", background: isSubActive ? "var(--primary)" : "transparent", color: isSubActive ? "white" : "rgba(255,255,255,0.7)" }}>
                                    <span>{sub.label}</span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = item.href === "/dashboard" 
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`nav-item ${isActive ? "active" : ""}`} style={{ position: "relative" }}>
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 12px", marginBottom: 4 }}>
            <p style={{ color: "white", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "capitalize" }}>{user.role}</p>
          </div>
          <button onClick={handleLogout} className="nav-item" style={{ color: "rgba(255,100,100,0.8)", width: "calc(100% - 16px)" }}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{ position: "relative" }}>
        <NotificationBell />
        {showShiftWarning ? (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center", animation: "slideUp 0.3s ease" }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Wallet size={32} />
              </div>
              <h2 style={{ fontSize: 20, marginBottom: 8, color: "var(--text-dark)" }}>Buka Kasir Dulu!</h2>
              <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
                Anda belum memulai <b>Shift</b> untuk hari ini. Silakan buka kasir untuk mencatat saldo awal sebelum melayani transaksi atau mengakses menu lainnya.
              </p>
              <Link href="/dashboard" style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "12px 24px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
                Ke Halaman Utama
              </Link>
            </div>
          </div>
        ) : children}
      </main>
    </div>
  );
}
