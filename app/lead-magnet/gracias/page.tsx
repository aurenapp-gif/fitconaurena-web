import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "¡Email confirmado! — Accede a los recursos",
  description:
    "Has confirmado tu email correctamente. Accede ya a la carpeta de recursos de Fit con Aurena.",
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  const driveUrl = process.env.NEXT_PUBLIC_DRIVE_FOLDER_URL;

  return (
    <>
      <Navbar />

      <section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, #CAFF00 0%, transparent 70%)",
          }}
        />

        <div className="container-narrow relative z-10 py-24 md:py-32 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-8 mx-auto border border-[#CAFF00]/40 bg-[#CAFF00]/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CAFF00"
              strokeWidth="3"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1
            className="font-black text-white leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}
          >
            ¡Email <span className="text-[#CAFF00]">confirmado!</span>
          </h1>

          <p
            className="text-[#A0A0A0] leading-relaxed mb-10 mx-auto max-w-xl"
            style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)" }}
          >
            Gracias por confirmar. Ya tienes acceso a la carpeta de recursos.
            Te enviaremos por email cada nueva guía, plan o webinar que
            añadamos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            {driveUrl ? (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand text-base px-8 py-4"
              >
                Abrir carpeta de recursos
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            ) : (
              <p className="text-sm text-[#666666]">
                En breve recibirás el enlace por email.
              </p>
            )}
            <Link
              href="/#tarifas"
              className="btn-outline text-base px-8 py-4"
            >
              Conocer el coaching 1:1
            </Link>
          </div>

          <p className="text-xs text-[#666666]">
            Si la carpeta no se abre, copia este enlace en tu navegador o
            escríbenos.
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #0A0A0A, transparent)",
          }}
        />
      </section>
    </>
  );
}
