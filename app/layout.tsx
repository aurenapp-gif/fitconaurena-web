import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavProgress from "@/components/NavProgress";

/**
 * Inter servida desde el propio repositorio, no descargada de Google al
 * compilar.
 *
 * `next/font/google` se baja la tipografía durante el build. Cuando la máquina
 * que compila no puede llegar a fonts.gstatic.com —pasó: tres reintentos y
 * ETIMEDOUT— el build entero falla por algo que no tiene nada que ver con el
 * código. Con el archivo dentro del repositorio no hay red de por medio.
 *
 * Es la variable, que cubre de 100 a 900 en un solo archivo de 48 KB, menos que
 * los seis estáticos que se usaban antes. Inter es SIL Open Font License; la
 * licencia va al lado del archivo.
 */
const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
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
      <body className="antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
