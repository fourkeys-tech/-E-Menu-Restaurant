import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartMenu — Digital E-Menu",
  description: "Pesan makanan & minuman langsung dari meja Anda tanpa antre.",
};

// Viewport fields belong here in Next.js 16 — `themeColor` inside `metadata` is
// deprecated, and a hand-written <meta name="viewport"> in <head> would duplicate
// the one Next already injects. Pinch-zoom stays enabled on purpose.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1A1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
