import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Fit con Aurena — Entrenamiento y Nutrición 1:1 para Mujeres",
    template: "%s | Fit con Aurena",
  },
  description:
    "Servicio personalizado 1:1 de nutrición y entrenamiento para mujeres. App con seguimiento del ciclo menstrual. +400 mujeres transformadas. Sin permanencia.",
  metadataBase: new URL("https://fitconaurena.com"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://fitconaurena.com",
    siteName: "Fit con Aurena",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Aurena" },
  icons: { icon: "/icon.svg", apple: "/icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
