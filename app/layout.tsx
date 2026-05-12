import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StickyCtaBar from "@/components/StickyCtaBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Fit con Aurena — Servicio 1:1 de Nutrición y Entrenamiento para Mujeres",
    template: "%s | Fit con Aurena",
  },
  description:
    "Servicio personalizado 1:1 de nutrición y entrenamiento para mujeres. App con seguimiento del ciclo menstrual. +400 mujeres transformadas. Sin permanencia.",
  keywords: [
    "servicio 1:1 mujeres",
    "entrenamiento personalizado mujeres",
    "nutrición para mujeres",
    "ciclo menstrual entrenamiento",
    "perder peso mujeres",
    "fitness mujeres español",
    "Aurena",
    "Fit con Aurena",
  ],
  authors: [{ name: "Fit con Aurena" }],
  creator: "Fit con Aurena",
  metadataBase: new URL("https://fitconaurena.com"),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://fitconaurena.com",
    siteName: "Fit con Aurena",
    title: "Fit con Aurena — Servicio 1:1 de Nutrición y Entrenamiento para Mujeres",
    description:
      "Servicio personalizado 1:1 con app de ciclo menstrual. +400 mujeres transformadas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fit con Aurena — Servicio 1:1 para Mujeres",
    description: "Nutrición y entrenamiento personalizado con seguimiento del ciclo menstrual.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased">
        <Navbar />
        <main className="pb-16 sm:pb-0">{children}</main>
        <Footer />
        <StickyCtaBar />
      </body>
    </html>
  );
}
