import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "¡Gracias por confirmar!",
  robots: { index: false, follow: false },
};

// URL de la carpeta/archivo de Google Drive con el contenido de la guía.
// Configúrala en Vercel como NEXT_PUBLIC_GUIDE_URL.
const DRIVE_URL = process.env.NEXT_PUBLIC_GUIDE_URL ?? "https://drive.google.com/";

export default function GraciasPage() {
  return (
    <>
      <Navbar />
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />

        <div className="container-narrow relative z-10 py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-[#CAFF00]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1 className="section-title mb-4">¡Correo verificado!</h1>
          <p className="section-sub mb-10 max-w-md mx-auto">
            Gracias por confirmar tu email. Ya tienes acceso a tu{" "}
            <strong className="text-white">Guía Fit con Aurena</strong>. Pulsa el botón
            para abrir el contenido en Google Drive.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand text-base px-8 py-4"
            >
              Acceder al contenido
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </a>
            <Link href="/" className="btn-outline text-base px-8 py-4">
              Volver al inicio
            </Link>
          </div>

          <p className="mt-8 text-xs text-[#666666]">
            ¿El botón no abre? Copia este enlace: <span className="text-[#A0A0A0] break-all">{DRIVE_URL}</span>
          </p>
        </div>
      </section>
    </>
  );
}
