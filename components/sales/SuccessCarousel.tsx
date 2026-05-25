const cases = [
  { initials: "LM", name: "Laura M.", metric: "-14 kg en 3 meses", quote: "Por fin entiendo mi cuerpo y cómo cuidarlo" },
  { initials: "SP", name: "Sara P.", metric: "-8 kg en 6 semanas", quote: "Nunca había tenido tanta energía en mi vida" },
  { initials: "CR", name: "Carmen R.", metric: "+6 kg masa muscular", quote: "El seguimiento 1:1 marcó la diferencia total" },
  { initials: "MG", name: "María G.", metric: "-10 kg en 2 meses", quote: "Aprendí a comer bien sin restricciones locas" },
  { initials: "AV", name: "Andrea V.", metric: "-16 kg en 4 meses", quote: "Mi ciclo y mi energía mejoraron muchísimo" },
  { initials: "LS", name: "Lucía S.", metric: "-7 kg en 5 semanas", quote: "El plan se adaptó a mi vida, no al revés" },
  { initials: "ET", name: "Elena T.", metric: "-12 kg en 3 meses", quote: "Nunca pensé que sería posible para mí" },
  { initials: "NF", name: "Natalia F.", metric: "+8 kg músculo en 5 meses", quote: "Cambió mi relación con la comida para siempre" },
];

const casesRow2 = [
  { initials: "RB", name: "Rosa B.", metric: "-11 kg en 10 semanas", quote: "Me siento fuerte y segura de mí misma" },
  { initials: "IL", name: "Irene L.", metric: "-9 kg en 2 meses", quote: "El método es muy diferente a lo que había probado" },
  { initials: "PD", name: "Paula D.", metric: "-13 kg en 3 meses", quote: "Perdí peso sin pasar hambre, increíble" },
  { initials: "VH", name: "Verónica H.", metric: "+5 kg músculo en 4 meses", quote: "Mi cuerpo cambió más de lo que esperaba" },
  { initials: "BM", name: "Beatriz M.", metric: "-6 kg en 6 semanas", quote: "La app hace que sea muy fácil de seguir" },
  { initials: "CN", name: "Cristina N.", metric: "-15 kg en 4 meses", quote: "Por primera vez lo conseguí con ayuda real" },
  { initials: "AO", name: "Alicia O.", metric: "-10 kg en 12 semanas", quote: "El cambio fue físico y también mental" },
  { initials: "MR", name: "Marina R.", metric: "+7 kg músculo en 6 meses", quote: "Nunca me había sentido tan bien con mi cuerpo" },
];

function CaseCard({ initials, name, metric, quote }: (typeof cases)[number]) {
  return (
    <div
      className="flex-shrink-0 w-72 rounded-2xl p-5 mx-3"
      style={{ background: "#161616", border: "1px solid #252525" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: "rgba(202,255,0,0.12)", color: "#CAFF00" }}
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="text-xs font-bold" style={{ color: "#CAFF00" }}>{metric}</div>
        </div>
      </div>
      <p className="text-sm text-[#A0A0A0] leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex gap-0.5 mt-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="text-xs" style={{ color: "#CAFF00" }}>★</span>
        ))}
      </div>
    </div>
  );
}

export default function SuccessCarousel() {
  const row1 = [...cases, ...cases];
  const row2 = [...casesRow2, ...casesRow2];

  return (
    <section className="py-20 md:py-28">
      {/* Section header */}
      <div className="container-content text-center mb-12">
        <span className="section-tag">Casos de éxito</span>
        <h2 className="section-title mb-4">
          Resultados reales de mujeres reales
        </h2>
        <p className="section-sub max-w-lg mx-auto">
          Más de 400 mujeres ya han transformado su cuerpo con nuestro método.
        </p>
      </div>

      {/* Carousel wrapper with edge fades */}
      <div className="relative">
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #0A0A0A, transparent)" }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #0A0A0A, transparent)" }}
        />

        {/* Row 1 — scrolls left */}
        <div className="group overflow-hidden py-2 mb-4">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
            {row1.map((c, i) => (
              <CaseCard key={`r1-${c.name}-${i}`} {...c} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="group overflow-hidden py-2">
          <div className="flex w-max animate-marquee-reverse group-hover:[animation-play-state:paused]">
            {row2.map((c, i) => (
              <CaseCard key={`r2-${c.name}-${i}`} {...c} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
