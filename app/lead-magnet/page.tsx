import type { Metadata } from "next";
import LeadMagnetForm from "@/components/LeadMagnetForm";

export const metadata: Metadata = {
  title: "Recursos gratis — entrenamiento y nutrición",
  description:
    "Accede gratis a nuestra carpeta de recursos: guías, planes y material exclusivo para mujeres que quieren transformar su cuerpo de forma real.",
  robots: { index: true, follow: true },
};

const perks = [
  "Guías y planes en PDF descargables",
  "Webinars y vídeos exclusivos",
  "Material que actualizamos cada mes",
];

export default function LeadMagnetPage() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)",
        }}
      />

      <div className="container-narrow relative z-10 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-[#252525] bg-[#161616] text-[#A0A0A0]">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#CAFF00] motion-safe:animate-pulse"
            aria-hidden="true"
          />
          1000 mujeres han conseguido su cambio gracias al método Aurena
        </div>

        <h1
          className="font-black text-white leading-[1.05] tracking-tight mb-6"
          style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}
        >
          Llévate nuestros{" "}
          <span className="text-[#CAFF00]">recursos gratis</span>
        </h1>

        <p
          className="text-[#A0A0A0] leading-relaxed mb-10 mx-auto max-w-xl"
          style={{ fontSize: "clamp(1rem, 1.8vw, 1.15rem)" }}
        >
          Déjanos tu email y te damos acceso a nuestra carpeta privada con
          guías, planes y contenido exclusivo para entrenar y comer mejor.
        </p>

        <ul className="flex flex-col gap-3 mb-10 max-w-md mx-auto text-left">
          {perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-3 text-[#A0A0A0]"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#CAFF00"
                strokeWidth="2.5"
                className="flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        <div className="max-w-lg mx-auto">
          <LeadMagnetForm />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #0A0A0A, transparent)",
        }}
      />
    </section>
  );
}
