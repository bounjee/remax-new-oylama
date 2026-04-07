import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RE/MAX BEST - Şıklık Oylaması",
  description: "RE/MAX BEST Şıklık Oylaması - En Şık Hanımefendi ve Beyefendiyi Birlikte Seçiyoruz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[#e8edf3]">{children}</body>
    </html>
  );
}
