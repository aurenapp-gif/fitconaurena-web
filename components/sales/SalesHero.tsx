export default function SalesHero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full blur-[140px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
      />

      <div className="container-content relative z-10 py-28 md:py-36 text-center">
        {/* Social proof badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-[#252525] bg-[#161616] text-[#A0A0A0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#CAFF00] animate-pulse" />
          +400 mujeres ya han transformado su cuerpo · ⭐⭐⭐⭐⭐
        </div>

        {/* Headline */}
        <h1
          className="font-black text-white leading-[1.05] tracking-tight mb-6"
          style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
        >
          Pierde grasa, gana músculo
          <br />
          <span className="text-[#CAFF00]">y entiende tu cuerpo de una vez.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-[#A0A0A0] leading-relaxed mb-4 max-w-2xl mx-auto"
          style={{ fontSize: "clamp(1rem, 1.8vw, 1.2rem)" }}
        >
          Programa 1:1 de nutrición y entrenamiento diseñado específicamente para mujeres.
          Sin dietas restrictivas. Con seguimiento real y un plan que se adapta a tu ciclo.
        </p>
        <p
          className="text-[#666666] leading-relaxed mb-12 max-w-xl mx-auto"
          style={{ fontSize: "clamp(0.9rem, 1.4vw, 1rem)" }}
        >
          Mira el vídeo y descubre cómo funciona el método →
        </p>

        {/* CTA */}
        <a
          href="#quiz"
          className="btn-brand text-base px-10 py-4"
        >
          Quiero transformar mi cuerpo
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>

        {/* Trust stats */}
        <div className="flex flex-wrap justify-center gap-10 mt-16">
          {[
            { value: "+400", label: "Mujeres activas" },
            { value: "5★", label: "Valoración media" },
            { value: "1:1", label: "Seguimiento real" },
            { value: "0€", label: "Permanencia" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-black text-white" style={{ fontSize: "1.6rem", lineHeight: 1 }}>
                {s.value}
              </div>
              <div className="text-xs text-[#666666] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0A0A0A, transparent)" }}
      />
    </section>
  );
}
