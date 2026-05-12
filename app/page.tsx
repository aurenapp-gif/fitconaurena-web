import Navbar from "@/components/Navbar";
import Link from "next/link";

const stats = [
  { value: "+400", label: "Mujeres activas" },
  { value: "5★", label: "Valoración Upstore" },
  { value: "1:1", label: "Seguimiento real" },
  { value: "0€", label: "Permanencia" },
];

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />

        <div className="container-wide relative z-10 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-[#252525] bg-[#161616] text-[#A0A0A0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CAFF00] animate-pulse" />
              +400 mujeres ya en el programa · ⭐⭐⭐⭐⭐ Upstore
            </div>

            {/* Headline */}
            <h1
              className="font-black text-white leading-[1.05] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              Transforma tu cuerpo.
              <br />
              <span className="text-[#CAFF00]">En serio.</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-[#A0A0A0] leading-relaxed mb-10 max-w-xl"
              style={{ fontSize: "clamp(1rem, 1.8vw, 1.2rem)" }}
            >
              Servicio 1:1 de nutrición y entrenamiento personalizado para mujeres.
              Con una app que entiende tu ciclo menstrual y ajusta tu plan cada mes.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-20">
              <Link href="/#tarifas" className="btn-brand text-base px-8 py-4">
                Ver planes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/#como-funciona" className="btn-outline text-base px-8 py-4">
                Cómo funciona
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-10">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-black text-white" style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div className="text-xs text-[#666666] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(to top, #0A0A0A, transparent)" }} />
      </section>
    </>
  );
}
