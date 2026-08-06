import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartMenu Admin — Dashboard",
  description: "Panel administrasi SmartMenu untuk restoran dan kafe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
