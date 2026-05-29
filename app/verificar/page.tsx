import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { verifyToken } from "@/lib/token";
import { markLeadVerified } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verificación de email",
  robots: { index: false, follow: false },
};

const GUIDE_URL = process.env.NEXT_PUBLIC_GUIDE_URL ?? "/guia-fit-con-aurena.pdf";

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const result = verifyToken(token);

  if (result.ok) {
    // Pluggable storage hook — logs by default.
    await markLeadVerified(result.email).catch((e) =>
      console.error("[verificar] markLeadVerified failed", e)
    );
  }

  return (
    <>
      <Navbar />
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />

        <div className="container-narrow relative z-10 py-24 text-center">
          {result.ok ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-[#CAFF00]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="section-title mb-4">¡Email confirmado!</h1>
              <p className="section-sub mb-10 max-w-md mx-auto">
                Gracias por confirmar. Tu <strong className="text-white">Guía Fit con Aurena</strong>{" "}
                ya está lista para descargar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href={GUIDE_URL} download className="btn-brand text-base px-8 py-4">
                  Descargar la guía
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                  </svg>
                </a>
                <Link href="/" className="btn-outline text-base px-8 py-4">
                  Volver al inicio
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 border border-[#252525] bg-[#161616]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              </div>
              <h1 className="section-title mb-4">
                {result.reason === "expired" ? "El enlace ha caducado" : "Enlace no válido"}
              </h1>
              <p className="section-sub mb-10 max-w-md mx-auto">
                {result.reason === "expired"
                  ? "Este enlace de verificación ha caducado. Vuelve a solicitar la guía para recibir uno nuevo."
                  : "No hemos podido validar este enlace. Vuelve a solicitar la guía desde la página de inicio."}
              </p>
              <Link href="/#guia-gratis" className="btn-brand text-base px-8 py-4">
                Solicitar la guía de nuevo
              </Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
