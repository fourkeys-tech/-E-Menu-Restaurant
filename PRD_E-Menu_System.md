# Product Requirements Document (PRD)
# Sistem E-Menu Digital untuk Restoran / Cafe

| | |
|---|---|
| **Nama Produk** | SmartMenu — Digital E-Menu & Ordering System |
| **Versi Dokumen** | 1.1 (Revisi: Fokus UI Profesional & Simplifikasi Payment) |
| **Tanggal** | 5 Agustus 2026 |
| **Status** | Draft untuk Review |
| **Tech Stack** | Next.js (Frontend) + Express.js (Backend) |
| **Metode Pembayaran** | Midtrans (QRIS/E-wallet/VA) & Bayar di Kasir (Cash/EDC) |

---

## 1. Ringkasan Eksekutif

SmartMenu adalah sistem menu digital berbasis web yang memungkinkan pelanggan restoran/cafe untuk melihat menu, memesan makanan/minuman, dan melakukan pembayaran langsung dari smartphone mereka melalui QR Code yang ditempel di meja — tanpa perlu aplikasi tambahan (web-based, PWA-ready).

Sistem ini terdiri dari 3 modul utama:
1. **Customer E-Menu App** — antarmuka pelanggan untuk melihat menu & memesan
2. **Admin/Backoffice Dashboard** — pengelolaan menu, meja, pesanan, laporan
3. **Kitchen Display System (KDS)** — layar dapur untuk menerima & mengelola pesanan real-time

---

## 1.1 Arahan Desain & Kesan Visual

SmartMenu diposisikan sebagai produk **premium & profesional** — tampilan menu digital harus mencerminkan kualitas resto/cafe itu sendiri, bukan sekadar daftar harga digital. Prinsip desain yang dipegang:

- **Food photography-first** — foto menu jadi elemen utama, gunakan rasio gambar konsisten (4:3 atau 1:1), high-resolution, dengan lazy-loading & blur placeholder agar tetap terasa cepat.
- **Clean & minimal layout** — banyak whitespace, tidak padat, fokus pengguna ke satu aksi per waktu (lihat menu → pilih → checkout).
- **Branding yang dapat disesuaikan (white-label ready)** — setiap resto dapat mengatur logo, warna utama (primary color), dan font sesuai identitas mereka melalui dashboard admin, tanpa perlu ubah kode.
- **Micro-interaction halus** — animasi ringan saat tambah ke keranjang, transisi antar kategori, skeleton loading saat data dimuat, feedback visual saat status order berubah.
- **Konsistensi komponen (Design System)** — dibangun dengan pola atomic design agar semua tombol, kartu menu, badge status, dan form terlihat seragam di seluruh aplikasi (customer, admin, KDS).

### Panduan Visual (Default Theme)

| Elemen | Rekomendasi |
|---|---|
| **Tipografi** | Heading: `Plus Jakarta Sans` / `Poppins` (Semi-Bold–Bold); Body: `Inter` (Regular–Medium) untuk keterbacaan tinggi di layar kecil |
| **Palet Warna Dasar** | Primary: warna gelap elegan (mis. Charcoal `#1A1A1A` atau Deep Green `#0F3D2E`) dipadu Accent hangat (mis. Amber `#D9A441` / Terracotta `#C1502E`) — kesan restoran premium; warna dapat diganti per tenant |
| **Neutral Palette** | Off-white `#FAFAF8` untuk background, Gray `#6B7280` untuk teks sekunder |
| **Border Radius** | 12–16px (rounded-xl) untuk kartu & tombol → kesan modern, tidak kaku |
| **Elevation** | Soft shadow tipis pada kartu menu & floating cart, hindari shadow tebal/kasar |
| **Ikonografi** | Line-icon set konsisten (Lucide/Phosphor Icons) |
| **Grid System** | 8pt spacing system agar rapi di semua breakpoint |

### Komponen UI Kunci
- **Menu Card**: foto besar, nama item, harga (bold), badge kecil untuk "Best Seller"/"Pedas"/"Habis", tombol tambah dengan animasi bounce.
- **Sticky Category Navigation**: kategori tetap terlihat saat scroll (sticky tab), auto-highlight kategori aktif.
- **Floating Cart Bar**: muncul dari bawah dengan animasi slide-up saat ada item di keranjang, menampilkan jumlah item & total harga real-time.
- **Status Badge Order**: warna berbeda per status (kuning = menunggu, biru = diproses, hijau = siap/selesai) agar mudah dipindai secara visual.
- **Empty & Loading States**: didesain khusus (bukan blank page) — ilustrasi ringan saat menu kosong, skeleton loader saat data dimuat.

---

## 2. Latar Belakang & Masalah yang Dipecahkan

| Masalah Saat Ini | Solusi SmartMenu |
|---|---|
| Menu fisik/cetak mahal diperbarui & tidak higienis | Menu digital, update real-time tanpa cetak ulang |
| Pelanggan menunggu lama untuk dilayani pramusaji | Self-order langsung dari meja via QR |
| Kesalahan pencatatan pesanan manual | Order otomatis masuk ke sistem & dapur |
| Sulit menganalisis menu terlaris & omzet | Dashboard analitik & laporan penjualan |
| Antrean kasir saat jam sibuk | Opsi pembayaran online terintegrasi |

---

## 3. Tujuan Produk (Goals)

1. Mempercepat proses pemesanan hingga 40% dibanding metode manual.
2. Mengurangi kesalahan pesanan (order error) menjadi < 2%.
3. Memberikan data penjualan & performa menu secara real-time kepada pemilik usaha.
4. Meningkatkan efisiensi operasional dapur melalui integrasi Kitchen Display.
5. Skalabel untuk multi-outlet/multi-cabang di masa depan.

### Non-Goals (Di luar cakupan versi 1.0)
- Aplikasi mobile native (iOS/Android)
- Sistem loyalty/membership point kompleks
- Integrasi dengan alat kasir/POS pihak ketiga (dijadwalkan versi 2.0)
- Reservasi meja

---

## 4. Target Pengguna & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Pelanggan (Guest)** | Pengunjung restoran/cafe | Melihat menu, memesan, membayar dengan cepat & mudah |
| **Kasir/Waiter** | Staff yang membantu proses order & pembayaran offline | Kelola pesanan masuk, konfirmasi pembayaran cash |
| **Chef/Dapur** | Staff dapur | Menerima & update status pesanan secara real-time |
| **Admin/Owner** | Pemilik atau manajer restoran | Kelola menu, harga, meja, laporan penjualan |
| **Super Admin** | Pengelola sistem multi-outlet (opsional) | Kelola banyak cabang dalam satu dashboard |

---

## 5. User Stories Utama

**Pelanggan**
- Sebagai pelanggan, saya ingin memindai QR Code di meja agar langsung melihat menu tanpa install aplikasi.
- Sebagai pelanggan, saya ingin memfilter menu berdasarkan kategori (makanan, minuman, promo).
- Sebagai pelanggan, saya ingin menambahkan catatan khusus pada pesanan (misal: "tidak pedas").
- Sebagai pelanggan, saya ingin melihat status pesanan saya (diterima, diproses, disajikan).
- Sebagai pelanggan, saya ingin membayar via QRIS/e-wallet langsung dari menu.

**Admin/Owner**
- Sebagai admin, saya ingin menambah/mengedit/menghapus item menu beserta foto, harga, dan stok.
- Sebagai admin, saya ingin mengatur ketersediaan menu (habis/tersedia) secara real-time.
- Sebagai admin, saya ingin melihat laporan penjualan harian/mingguan/bulanan.
- Sebagai admin, saya ingin mengelola data meja & generate QR Code otomatis.

**Chef/Dapur**
- Sebagai chef, saya ingin melihat pesanan baru secara real-time di layar dapur.
- Sebagai chef, saya ingin mengubah status pesanan (diterima → diproses → selesai).

**Kasir**
- Sebagai kasir, saya ingin melihat & mengonfirmasi pesanan yang dibayar cash/tunai.
- Sebagai kasir, saya ingin mencetak struk pesanan.

---

## 6. Ruang Lingkup Fitur (Scope)

### 6.1 Modul Customer E-Menu (Next.js — Public Facing)
- Landing page menu via scan QR (`/menu/:tableId` atau `/menu/:restaurantSlug`)
- Kategori & pencarian menu
- Detail produk (foto, deskripsi, harga, varian/topping, allergen info)
- Keranjang pesanan (cart) dengan kalkulasi total otomatis
- Catatan tambahan per item
- Checkout dengan **2 metode pembayaran**:
  1. **Midtrans** — QRIS, e-wallet (GoPay/OVO/Dana/ShopeePay), dan Virtual Account, pembayaran langsung dari HP pelanggan
  2. **Bayar di Kasir** — pesanan dikirim ke sistem dengan status "Menunggu Pembayaran di Kasir", pelanggan tinggal ke kasir dengan nomor meja/nomor order
- Order tracking real-time (status pesanan)
- Multi-bahasa (opsional: ID/EN)
- Responsive & PWA (dapat di-"Add to Home Screen")

### 6.2 Modul Admin Dashboard (Next.js — Protected/Auth)
- Login & manajemen role (Admin, Kasir, Chef)
- CRUD Menu (kategori, item, harga, foto, stok, varian)
- Manajemen Meja & generator QR Code per meja
- Manajemen Pesanan (lihat, ubah status, batalkan)
- Laporan & Analitik (menu terlaris, omzet, jam ramai)
- Manajemen Promo/Diskon
- Pengaturan restoran (jam buka, info kontak, pajak/service charge)

### 6.3 Modul Kitchen Display System / KDS (Next.js — Internal)
- Papan pesanan real-time (Kanban: New → Cooking → Ready → Served)
- Notifikasi suara untuk pesanan baru
- Update status via satu klik

### 6.4 Backend API (Express.js)
- REST API untuk seluruh modul di atas
- Autentikasi & otorisasi (JWT + role-based access control)
- WebSocket/Socket.io untuk update pesanan real-time
- Integrasi payment gateway (Midtrans/Xendit untuk QRIS & e-wallet)
- Upload & manajemen gambar menu (cloud storage)
- Sistem notifikasi (email/push opsional)

---

## 7. Arsitektur Teknis

### 7.1 Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend Customer & Admin | **Next.js 14+ (App Router)**, TypeScript, TailwindCSS |
| State Management | Zustand / React Query (TanStack Query) |
| Backend API | **Express.js** + TypeScript |
| Database | PostgreSQL (relational, cocok untuk transaksi order) |
| ORM | Prisma |
| Real-time Communication | Socket.io |
| Autentikasi | JWT + bcrypt, NextAuth.js (untuk dashboard admin) |
| Payment Gateway | **Midtrans** (Snap API — QRIS, e-wallet, Virtual Account) |
| Design System | TailwindCSS + shadcn/ui (base component), disesuaikan dengan theme per tenant |
| File/Image Storage | Cloudinary / AWS S3 |
| Hosting Frontend | Vercel |
| Hosting Backend | Railway / AWS EC2 / VPS |
| CI/CD | GitHub Actions |
| Monitoring & Logging | Sentry, Winston/Pino |

### 7.2 Diagram Arsitektur (High-Level)

```
[Pelanggan - Scan QR]        [Admin/Kasir/Chef - Login]
        │                              │
        ▼                              ▼
┌───────────────────┐         ┌───────────────────┐
│  Next.js Frontend  │         │  Next.js Dashboard │
│  (Customer E-Menu) │         │  (Admin + KDS)      │
└─────────┬──────────┘         └─────────┬──────────┘
          │        REST API + WebSocket             │
          └───────────────┬─────────────────────────┘
                           ▼
                ┌─────────────────────┐
                │   Express.js API     │
                │  (Auth, Order, Menu, │
                │   Payment, Socket.io)│
                └──────────┬───────────┘
                            │
             ┌──────────────┼───────────────┐
             ▼               ▼                ▼
      ┌────────────┐  ┌─────────────┐ ┌──────────────┐
      │ PostgreSQL │  │  Cloudinary  │ │ Payment GW   │
      │ (Prisma)   │  │ (Image Store)│ │(Midtrans/Xendit)│
      └────────────┘  └─────────────┘ └──────────────┘
```

### 7.3 Rancangan Skema Database (Ringkas)

**users** — id, name, email, password_hash, role (admin/kasir/chef/super_admin), restaurant_id

**restaurants** — id, name, slug, address, logo_url, open_hours, tax_percentage

**tables** — id, restaurant_id, table_number, qr_code_url

**categories** — id, restaurant_id, name, sort_order

**menu_items** — id, category_id, name, description, price, image_url, is_available, stock, variants (JSON), allergen_info

**orders** — id, table_id, order_number, status (pending/cooking/ready/served/completed/cancelled), payment_status (unpaid/paid/waiting_at_cashier), payment_method (`midtrans` / `cashier`), subtotal, tax, total, created_at

**order_items** — id, order_id, menu_item_id, quantity, notes, price_at_order, variant_selected

**payments** — id, order_id, method (`midtrans`/`cashier`), gateway_transaction_id (nullable, khusus Midtrans), midtrans_payment_type (qris/gopay/va/dll — nullable), status (pending/settlement/expired/cancelled/paid_manual), amount, confirmed_by (user_id kasir, khusus metode cashier), paid_at

**promotions** — id, restaurant_id, name, discount_type, discount_value, start_date, end_date

---

## 8. Alur Utama (Core Flow)

### 8.1 Flow Pemesanan Pelanggan
1. Pelanggan scan QR Code di meja → diarahkan ke `/menu/{restaurantSlug}?table={tableId}`
2. Melihat daftar menu berdasarkan kategori
3. Menambahkan item ke keranjang (+ catatan/varian)
4. Checkout → pelanggan memilih salah satu dari **2 metode pembayaran**:
   - **Opsi A — Midtrans**: sistem membuka Snap popup Midtrans (QRIS/e-wallet/VA) → pelanggan bayar → Midtrans mengirim callback/webhook ke backend → status order otomatis berubah menjadi "paid" → order langsung diteruskan ke dapur
   - **Opsi B — Bayar di Kasir**: order langsung dibuat dengan status `payment_status: waiting_at_cashier` → order tetap diteruskan ke dapur untuk mulai diproses (agar tidak ada delay) → kasir mengonfirmasi pembayaran cash/EDC melalui dashboard saat pelanggan datang ke kasir
5. Order masuk ke sistem → notifikasi real-time ke KDS via Socket.io (berlaku untuk kedua metode pembayaran)
6. Pelanggan dapat memantau status pesanan (termasuk status pembayaran) di halaman yang sama

### 8.2 Flow Dapur (Kitchen Display)
1. Pesanan baru muncul otomatis di kolom "New Order" (via WebSocket)
2. Chef klik "Start Cooking" → status berubah "Cooking"
3. Chef klik "Ready" → status berubah, notifikasi ke kasir/waiter
4. Waiter antar pesanan → klik "Served" → order selesai

### 8.3 Flow Admin
1. Login ke dashboard
2. Kelola menu (tambah/edit/nonaktifkan)
3. Generate & cetak QR Code untuk tiap meja
4. Pantau pesanan masuk & laporan penjualan

---

## 9. Kebutuhan Non-Fungsional

| Kategori | Requirement |
|---|---|
| **Performa** | Waktu load halaman menu < 2 detik; update real-time < 1 detik latency |
| **Skalabilitas** | Backend mampu handle 500+ concurrent users per outlet saat jam sibuk |
| **Keamanan** | HTTPS wajib, JWT token expiry, rate limiting API, validasi input (Zod/Joi), proteksi terhadap SQL Injection & XSS |
| **Ketersediaan** | Uptime target 99.5% |
| **Kompatibilitas** | Mendukung browser modern (Chrome, Safari, mobile browser), responsive di semua ukuran layar |
| **Aksesibilitas** | Kontras warna cukup, ukuran font mudah dibaca, alt text pada gambar menu |
| **Localization** | Format mata uang IDR, dukungan multi-bahasa (opsional) |

---

## 10. Rancangan API Endpoint (Contoh — Express.js)

```
Auth
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Menu (Public)
GET    /api/public/:restaurantSlug/menu
GET    /api/public/:restaurantSlug/menu/:itemId

Menu (Admin)
GET    /api/admin/menu
POST   /api/admin/menu
PUT    /api/admin/menu/:id
DELETE /api/admin/menu/:id

Orders
POST   /api/orders                 (create order - customer)
GET    /api/orders/:id/status      (tracking - customer)
GET    /api/admin/orders           (list - admin/kasir)
PATCH  /api/admin/orders/:id/status (update status - chef/kasir)

Tables
GET    /api/admin/tables
POST   /api/admin/tables
GET    /api/admin/tables/:id/qrcode

Payments
POST   /api/payments/midtrans/create     (generate Snap token/transaksi Midtrans)
POST   /api/payments/midtrans/webhook    (callback notifikasi status dari Midtrans)
POST   /api/admin/payments/:orderId/confirm-cashier   (kasir konfirmasi pembayaran manual di kasir)

Reports
GET    /api/admin/reports/sales?range=daily|weekly|monthly
GET    /api/admin/reports/top-items

WebSocket Events
- order:new
- order:status_updated
- menu:availability_changed
```

---

## 11. Wireframe / UX Notes (Deskripsi)

- **Halaman Menu Pelanggan**: Header dengan nama resto & nomor meja, kategori dalam bentuk tab/chip horizontal scroll, grid/list menu dengan foto besar, tombol "+" untuk tambah ke keranjang, floating cart button di bawah.
- **Halaman Keranjang**: List item dengan qty stepper, ringkasan harga (subtotal, pajak, total), tombol checkout.
- **Halaman Pilih Pembayaran**: 2 kartu pilihan besar & jelas — "Bayar Sekarang via Midtrans" (ikon QRIS/e-wallet, badge "Instan") dan "Bayar di Kasir" (ikon uang/kasir, keterangan "Tunjukkan nomor meja ke kasir") — desain kartu selectable dengan highlight saat dipilih.
- **Halaman Tracking Order**: Progress bar status (Diterima → Dimasak → Siap → Disajikan).
- **Dashboard Admin**: Sidebar navigasi (Menu, Pesanan, Meja, Laporan, Pengaturan), tabel data dengan search/filter, grafik penjualan (chart.js/recharts).
- **KDS Screen**: Tampilan kanban board full-screen, kartu order dengan warna berbeda per status & timer sejak order masuk.

---

## 12. Metrik Keberhasilan (Success Metrics / KPI)

| Metrik | Target |
|---|---|
| Rata-rata waktu pemesanan pelanggan | < 3 menit dari scan hingga checkout |
| Tingkat error pesanan | < 2% |
| Adoption rate (pelanggan yang order via e-menu vs manual) | > 70% dalam 3 bulan |
| Waktu rata-rata penyajian pesanan | Berkurang 20% dari sebelumnya |
| Uptime sistem | ≥ 99.5% |
| Kepuasan pengguna (survey) | ≥ 4.2/5 |

---

## 13. Roadmap & Milestone

| Fase | Durasi Estimasi | Output |
|---|---|---|
| **Fase 1: Discovery & Design** | 1-2 minggu | Wireframe, finalisasi PRD, desain database |
| **Fase 2: Setup & Core Backend** | 2 minggu | Setup Express API, auth, database, CRUD menu |
| **Fase 3: Customer E-Menu (Frontend)** | 2-3 minggu | Halaman menu, cart, checkout |
| **Fase 4: Admin Dashboard & KDS** | 2-3 minggu | Dashboard admin, kitchen display, real-time order |
| **Fase 5: Payment Integration** | 1-2 minggu | Integrasi Midtrans/Xendit, webhook |
| **Fase 6: Testing & QA** | 1-2 minggu | UAT, bug fixing, load testing |
| **Fase 7: Deployment & Launch** | 1 minggu | Deploy production, training staff resto |

**Total estimasi: ± 10-14 minggu (2.5-3.5 bulan)**

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Koneksi internet resto tidak stabil | Order gagal terkirim | Fallback offline mode / cache lokal + retry mechanism |
| Midtrans downtime/gagal transaksi | Pelanggan gagal bayar online | Opsi "Bayar di Kasir" selalu tersedia sebagai fallback utama tanpa perlu konfigurasi tambahan |
| Kasir lupa/telat konfirmasi pembayaran cash | Laporan penjualan tidak akurat | Notifikasi reminder di dashboard kasir untuk order berstatus `waiting_at_cashier` yang sudah lama, laporan rekonsiliasi harian |
| Staff resto gagap teknologi | Adopsi lambat | Buat UI sederhana + sesi training & user manual |
| Beban server tinggi saat jam ramai | Response lambat | Load testing awal, auto-scaling backend |
| Data menu tidak sinkron real-time | Pelanggan pesan menu yang habis | WebSocket update ketersediaan menu instan |

---

## 15. Lampiran

- **Struktur folder disarankan (Monorepo)**
```
smartmenu/
├── apps/
│   ├── web-customer/     (Next.js - customer e-menu)
│   ├── web-admin/        (Next.js - dashboard admin & KDS)
│   └── api/               (Express.js backend)
├── packages/
│   ├── shared-types/      (TypeScript types bersama)
│   └── ui/                 (shared UI components)
└── prisma/
    └── schema.prisma
```

- **Referensi Payment Gateway**: Midtrans Snap API (https://midtrans.com) — mendukung QRIS, GoPay, ShopeePay, Virtual Account (BCA/BNI/BRI/Mandiri/Permata), digunakan untuk metode pembayaran online; metode "Bayar di Kasir" dikelola sepenuhnya secara internal melalui dashboard kasir (tanpa pihak ketiga)

---

*Dokumen ini merupakan draft awal dan dapat disesuaikan lebih lanjut berdasarkan diskusi dengan stakeholder, hasil riset pengguna, dan kebutuhan spesifik bisnis restoran/cafe yang bersangkutan.*
