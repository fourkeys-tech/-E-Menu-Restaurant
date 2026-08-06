# SmartMenu - E-Menu & POS Management System

SmartMenu adalah sistem pemesanan makanan digital (E-Menu) sekaligus platform manajemen restoran (*Point of Sales* & *Kitchen Display System*) terintegrasi yang dibangun menggunakan arsitektur monorepo mutakhir.

Sistem ini ditujukan untuk memodernisasi cara restoran melayani pelanggan—mulai dari pemesanan mandiri via QR Code di meja, penyaluran pesanan ke layar dapur secara langsung (*real-time*), hingga perekapan laporan analitik penjualan bagi pemilik restoran.

## 🌟 Fitur Utama

### 📱 Sisi Pelanggan (Web Customer)
* **Pemesanan Mandiri via QR:** Membuka akses katalog menu instan berdasarkan identitas nomor meja.
* **Katalog & Kustomisasi Cerdas:** Menampilkan menu berbasis kategori dan mengizinkan pelanggan untuk memilih variasi (contoh: Level Pedas) serta memberikan catatan khusus.
* **Live Order Tracking:** Memantau pesanan (Menunggu Pembayaran ➔ Dimasak ➔ Disajikan) tanpa perlu memanggil pelayan.

### 💻 Sisi Restoran (Web Admin / POS)
* **Dashboard Karyawan (RBAC):** Sistem *Role-Based Access Control* (Admin, Kasir, Chef) untuk keamanan data.
* **Manajemen Pesanan & Pembayaran (Kasir):** Menyetujui/menolak pesanan, memasukkan nominal uang, kalkulasi kembalian, dan cetak setruk (mendukung format *printer thermal* 80mm).
* **Kitchen Display System (KDS):** Layar khusus untuk dapur yang berdering saat pesanan baru masuk dan memonitor antrean masak secara interaktif.
* **Log Aktivitas (Audit Trail):** Sistem pencegahan kecurangan (*fraud*) yang mencatat semua riwayat vital, seperti pembatalan pesanan atau manipulasi data menu.
* **Laporan & Ekspor Excel:** Visualisasi grafik tren penjualan harian/mingguan/bulanan dan tombol unduh **Excel (.xlsx)** berisi rangkuman performa restoran & menu terlaris.

---

## 🛠️ Tech Stack & Arsitektur

Sistem ini menggunakan arsitektur **Monorepo** (menggunakan NPM Workspaces) untuk berbagi beban dengan efisien:

* **Backend API (`apps/api`):** 
  * Node.js, Express.js
  * Prisma ORM (SQLite / PostgreSQL-ready)
  * Socket.io (WebSockets) untuk komunikasi *real-time*.
  * Autentikasi JWT (JSON Web Tokens).
* **Web Customer (`apps/web-customer`):** 
  * Next.js (React) App Router
  * TailwindCSS, Framer Motion
* **Web Admin (`apps/web-admin`):** 
  * Next.js (React) App Router
  * TailwindCSS, Recharts (Grafik Laporan), XLSX.
  * Tampilan CSS dioptimalkan untuk perangkat layar sentuh (Tablet/POS).

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah berikut untuk menjalankan sistem SmartMenu di komputer lokal Anda:

### 1. Prasyarat Sistem
* [Node.js](https://nodejs.org/) (versi 18 atau lebih baru).
* NPM (biasanya ter-instal bersama Node.js).

### 2. Kloning Repositori & Instalasi
Buka terminal Anda dan jalankan:
```bash
# Masuk ke folder proyek
cd e-menu-apps

# Instal semua dependensi untuk backend dan frontend
npm install
```

### 3. Persiapan Database
Masuk ke direktori API untuk memuat skema Prisma:
```bash
cd apps/api

# Membangun struktur database (SQLite)
npx prisma db push
npx prisma generate

# Menyuntikkan data sampel dasar (Menu, Meja, dan Akun Demo)
npm run db:seed
```

### 4. Menjalankan Server Utama
Kembali ke akar (*root*) proyek dan jalankan ketiganya secara bersamaan:
```bash
cd ../..
npm run dev
```

Aplikasi kini dapat diakses melalui:
* **Web Admin / Kasir:** [http://localhost:3002](http://localhost:3002)
* **Web Customer / E-Menu:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## 🔑 Akun Demo (Default)

Setelah Anda menjalankan perintah *seed* di atas, Anda bisa *login* ke **Web Admin** menggunakan kredensial berikut:

* **Admin:** `admin@kafenusantara.id` (Password: `admin123`)
* **Kasir:** `kasir@kafenusantara.id` (Password: `kasir123`)
* **Chef:** `chef@kafenusantara.id` (Password: `chef123`)

---

## 📜 Lisensi
Sistem ini bersifat hak milik (Proprietary). Segala bentuk distribusi dan penggunaan komersial harus mendapatkan izin.
