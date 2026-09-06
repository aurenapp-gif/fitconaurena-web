import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavProgress from "@/components/NavProgress";

/*
 * Tipografía: la del sistema. En iPhone es la misma que usan sus apps, que es
 * exactamente el efecto que se busca (que la app parezca de casa, no una web);
 * en Android, la suya. Sin archivo que descargar ni fuente que cargar: el
 * texto se pinta a la primera.
 */

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
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Aurena" },
  icons: { icon: "/icon.svg", apple: "/icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#F7F5F1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
