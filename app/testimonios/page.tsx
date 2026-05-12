import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Testimonios | Fit con Aurena — Casos de éxito reales",
  description: "Más de 3.200 personas ya han transformado su cuerpo y hábitos con Fit con Aurena. Lee sus historias reales.",
};

const featured = [
  {
    name: "María García",
    age: 34,
    city: "Madrid",
    before: "Llevaba 3 años sin resultados. Me apuntaba al gym y lo dejaba al mes.",
    result: "–14 kg en 4 meses",
    quote: "Por primera vez en mi vida entiendo por qué como lo que como. El plan de nutrición no es una dieta, es un cambio de mentalidad. Nunca había tenido tanta energía.",
    stats: [{ label: "Peso perdido", value: "14 kg" }, { label: "Semanas", value: "16" }, { label: "Valoración", value: "5/5" }],
    avatar: "MG",
    color: "#F472B6",
  },
  {
    name: "Carlos Ruiz",
    age: 28,
    city: "Barcelona",
    before: "Quería ganar masa muscular pero no sabía cómo comer para ello.",
    result: "+8 kg de músculo en 5 meses",
    quote: "El seguimiento semanal es lo que más valoro. No estás solo. Cuando tienes una semana mala, tu coach lo ve y ajusta el plan. Eso es lo que marca la diferencia.",
    stats: [{ label: "Músculo ganado", value: "8 kg" }, { label: "Semanas", value: "20" }, { label: "Valoración", value: "5/5" }],
    avatar: "CR",
    color: "#F59E0B",
  },
  {
    name: "Laura Sánchez",
    age: 42,
    city: "Valencia",
    before: "Después del parto nunca recuperé mi peso. Me sentía sin energía constante.",
    result: "–18 kg y recuperó la energía",
    quote: "Pensaba que a mi edad y con dos hijos era imposible. Me equivocaba. En 6 meses no solo perdí el peso, sino que me siento mejor que con 30 años.",
    stats: [{ label: "Peso perdido", value: "18 kg" }, { label: "Semanas", value: "24" }, { label: "Valoración", value: "5/5" }],
    avatar: "LS",
    color: "#8B5CF6",
  },
];

const testimonials = [
  { name: "Pablo M.", age: 31, city: "Sevilla", result: "–11 kg en 3 meses", quote: "La app es súper intuitiva. Los entrenamientos están perfectamente explicados con vídeo. Y el plan de nutrición es flexible, no tienes que comer pollo y brócoli.", rating: 5 },
  { name: "Ana T.", age: 26, city: "Bilbao", result: "+5 kg de músculo", quote: "Vine buscando tonificar y encontré mucho más: una comunidad increíble y unos hábitos que ya son parte de mi vida. El precio es una ganga comparado con un PT.", rating: 5 },
  { name: "Miguel A.", age: 45, city: "Zaragoza", result: "–9 kg, colesterol bajo", quote: "Mi médico me dijo que si seguía así no necesitaría medicación. Eso lo dice todo. El programa funciona y los coaches saben lo que hacen.", rating: 5 },
  { name: "Sofía R.", age: 22, city: "Málaga", result: "Perdió 7 kg para la boda", quote: "Tenía 4 meses para prepararme para mi boda. Conseguí el objetivo con tiempo de sobra y sin pasar hambre. Recomendado al 1000%.", rating: 5 },
  { name: "Roberto N.", age: 38, city: "Valladolid", result: "Maratón en 6 meses", quote: "Nunca había corrido más de 5km. Con el programa de Aurena llegué a completar mi primer maratón. La planificación y el apoyo de la comunidad fue clave.", rating: 5 },
  { name: "Elena V.", age: 50, city: "Alicante", result: "–12 kg con menopausia", quote: "La menopausia me complicaba todo. El equipo entendió mi situación y adaptó el programa. Los resultados hablan solos. Ojalá lo hubiera encontrado antes.", rating: 5 },
];

const stats = [
  { value: "3.200+", label: "Clientes activos" },
  { value: "4.8/5", label: "Valoración media" },
  { value: "94%", label: "Completan el programa" },
  { value: "30 días", label: "Garantía sin riesgo" },
];

export default function TestimoniosPage() {
  return (
    <main>
      {/* Hero */}
      <section className="pt-28 pb-16 text-center" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>
              Casos de éxito
            </span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-4 leading-tight text-ink">
              Resultados reales,<br className="hidden sm:block" />{" "}
              <span style={{ color: "#F472B6" }}>personas reales</span>
            </h1>
            <p className="text-lg max-w-lg mx-auto text-ink-muted">
              Más de 3.200 personas ya han transformado su cuerpo y sus hábitos. Aquí están sus historias.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 bg-white border-b border-gray-100">
        <div className="container-wide">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black mb-1" style={{ color: "#F472B6" }}>{s.value}</div>
                <div className="text-sm text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured testimonials */}
      <section className="section-py bg-cream">
        <div className="container-wide">
          <ScrollReveal>
            <span className="section-label">Historias destacadas</span>
            <h2 className="section-title mt-3">Transformaciones que inspiran</h2>
          </ScrollReveal>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featured.map((t) => (
              <ScrollReveal key={t.name} className="h-full">
                <div className="h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: t.color }}>
                        {t.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-ink">{t.name}</p>
                        <p className="text-xs text-ink-muted">{t.age} años · {t.city}</p>
                      </div>
                    </div>
                    <div className="inline-block text-sm font-bold px-3 py-1 rounded-full mb-4" style={{ background: "rgba(244,114,182,0.1)", color: "#EC4899" }}>
                      {t.result}
                    </div>
                    <p className="text-sm text-ink-muted italic mb-4 leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="text-xs text-ink-muted">{t.before}</p>
                  </div>
                  <div className="border-t p-4 grid grid-cols-3 gap-2" style={{ background: "#FFF0F5", borderColor: "#FCE7F3" }}>
                    {t.stats.map((s) => (
                      <div key={s.label} className="text-center">
                        <div className="text-sm font-black text-ink">{s.value}</div>
                        <div className="text-xs text-ink-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial grid */}
      <section className="section-py bg-white">
        <div className="container-wide">
          <ScrollReveal>
            <span className="section-label">Más historias</span>
            <h2 className="section-title mt-3">Lo que dice nuestra comunidad</h2>
          </ScrollReveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <ScrollReveal key={t.name}>
                <div className="card h-full">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                  <p className="text-sm text-ink-muted italic leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-auto pt-4 flex items-center justify-between" style={{ borderTop: "1px solid #F3F4F6" }}>
                    <div>
                      <p className="font-semibold text-sm text-ink">{t.name}</p>
                      <p className="text-xs text-ink-muted">{t.age} años · {t.city}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.1)", color: "#EC4899" }}>{t.result}</span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — pink gradient */}
      <section className="section-py text-white text-center" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">¿Lista para escribir tu historia?</h2>
            <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
              Únete a las 3.200+ personas que ya están en camino hacia su mejor versión.
            </p>
            <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 font-semibold cursor-pointer rounded-xl" style={{ padding: "18px 40px", fontSize: "16px", background: "white", color: "#EC4899" }}>
              Empezar gratis 30 días
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <p className="text-sm mt-4" style={{ color: "rgba(255,255,255,0.6)" }}>Sin tarjeta · Sin permanencia · Garantía 30 días</p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
