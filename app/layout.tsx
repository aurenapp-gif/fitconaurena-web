import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavProgress from "@/components/NavProgress";

/**
 * Manrope servida desde el propio repositorio, no descargada de Google al
 * compilar.
 *
 * `next/font/google` se baja la tipografía durante el build. Cuando la máquina
 * que compila no puede llegar a fonts.gstatic.com —pasó: tres reintentos y
 * ETIMEDOUT— el build entero falla por algo que no tiene nada que ver con el
 * código. Con el archivo dentro del repositorio no hay red de por medio.
 *
 * Es la variable (de 200 a 800 en un solo archivo de 24 KB, subconjunto
 * latino, que cubre el castellano entero). Manrope es SIL Open Font License;
 * la licencia va al lado del archivo.
 */
const manrope = localFont({
  src: "./fonts/Manrope-Variable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "200 800",
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
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Aurena" },
  icons: { icon: "/icon.svg", apple: "/icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#F6F7F9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
