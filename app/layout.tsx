import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEKO Preventivi Ristrutturazioni",
  description: "Preventivatore intelligente per ristrutturazioni appartamenti Piemonte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
