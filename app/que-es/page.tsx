import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Qué es Fit con Aurena | Método personalizado de fitness y nutrición",
  description: "Descubre cómo funciona Fit con Aurena: un programa de entrenamiento y nutrición 100% personalizado, con seguimiento diario y comunidad de apoyo.",
};

const steps = [
  { number: "01", title: "Completas tu perfil inicial", description: "Cuestionario de 5 minutos sobre tus objetivos, nivel de forma física, disponibilidad horaria, alergias alimentarias y equipamiento disponible.", icon: "📋" },
  { number: "02", title: "Recibres tu plan personalizado", description: "En menos de 24 horas tienes tu plan de entrenamiento y nutrición diseñado específicamente para ti. No es un plan genérico, es tuyo.", icon: "⚡" },
  { number: "03", title: "Entrenas con la app", description: "Cada entrenamiento con vídeo explicativo, tiempo de descanso automático y registro de series/reps. En casa, en el gym o donde quieras.", icon: "💪" },
  { number: "04", title: "Sigues tu nutrición", description: "Recetas sencillas, lista de la compra semanal y opciones flexibles para cuando comes fuera. Comer sano no tiene que ser aburrido.", icon: "🥗" },
  { number: "05", title: "Tu coach revisa y adapta", description: "Seguimiento semanal con tu coach. Si algo no funciona, el plan evoluciona contigo. El programa cambia, tu progreso no se detiene.", icon: "📈" },
];

const differentials = [
  { icon: "🎯", title: "100% personalizado", description: "No dos personas tienen el mismo plan. Adaptamos entrenamiento y nutrición a tu vida real, no al revés." },
  { icon: "🔬", title: "Basado en ciencia", description: "Periodización progresiva, macros calculados, sobrecompensación controlada. No modas, no bullshit, solo lo que funciona." },
  { icon: "🤝", title: "Acompañamiento real", description: "Tu coach ve tu progreso cada semana. Si flaqueas, te apoyamos. Si aceleras, subimos el nivel." },
  { icon: "📱", title: "Todo en una app", description: "Entrenamientos, nutrición, comunidad y seguimiento en una sola app. Sin papel, sin hojas de Excel, sin complicaciones." },
];

const profiles = [
  { icon: "🙋‍♀️", title: "Quieres bajar de peso", description: "Y hacerlo bien, sin efecto rebote ni dietas imposibles de mantener." },
  { icon: "💪", title: "Quieres ganar músculo", description: "Tienes base o empiezas desde cero. Con nutrición y entrenamiento optimizados." },
  { icon: "⚡", title: "Quieres más energía", description: "Cansado de llegar agotado a casa. El ejercicio es la mejor medicina conocida." },
  { icon: "🏃‍♂️", title: "Llevas tiempo sin hacer nada", description: "Sin juicios, sin presión. El primer paso es el más difícil, nosotros lo hacemos fácil." },
  { icon: "📱", title: "No tienes tiempo para el gym", description: "Entrena en casa con mínimo material. 30-45 min al día es suficiente con el plan correcto." },
  { icon: "🎯", title: "Has probado de todo sin éxito", description: "El problema no eres tú, es el método. Un plan personalizado cambia todo." },
];

export default function QueEsPage() {
  return (
    <main>
      <section className="pt-28 pb-20" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>Sobre el programa</span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-6 leading-tight text-ink">Tu programa de fitness{" "}<span style={{ color: "#F472B6" }}>tan único como tú</span></h1>
            <p className="text-lg leading-relaxed mb-8 max-w-xl text-ink-muted">Fit con Aurena no es una app de ejercicios genérica. Es un sistema completo de entrenamiento y nutrición personalizado, con seguimiento humano y comunidad real.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/tarifas" className="btn-primary" style={{ padding: "16px 32px" }}>Empezar gratis<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
              <Link href="/testimonios" className="btn-secondary" style={{ padding: "16px 32px" }}>Ver resultados reales</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-py bg-cream">
        <div className="container-content">
          <ScrollReveal><span className="section-label">Cómo funciona</span><h2 className="section-title mt-3">Del primer día a tus resultados</h2><p className="section-subtitle">5 pasos claros. Sin complicaciones.</p></ScrollReveal>
          <div className="mt-14 flex flex-col gap-8">
            {steps.map((step, i) => (
              <ScrollReveal key={step.number} delay={i * 80}>
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(244,114,182,0.1)" }}>{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2"><span className="text-xs font-bold tracking-widest" style={{ color: "#F472B6" }}>{step.number}</span><h3 className="text-lg font-bold text-ink">{step.title}</h3></div>
                    <p className="text-ink-muted leading-relaxed">{step.description}</p>
                  </div>
                </div>
                {i < steps.length - 1 && <div className="ml-7 mt-4 w-px h-6" style={{ background: "rgba(244,114,182,0.25)" }} />}
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py bg-white">
        <div className="container-wide">
          <ScrollReveal><span className="section-label">¿Por qué nosotros?</span><h2 className="section-title mt-3">Lo que nos hace diferentes</h2></ScrollReveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentials.map((d, i) => (<ScrollReveal key={d.title} delay={i * 80}><div className="card text-center h-full"><div className="text-4xl mb-4">{d.icon}</div><h3 className="font-bold text-ink mb-2">{d.title}</h3><p className="text-sm text-ink-muted leading-relaxed">{d.description}</p></div></ScrollReveal>))}
          </div>
        </div>
      </section>

      <section className="section-py bg-cream">
        <div className="container-wide">
          <ScrollReveal><span className="section-label">¿Es para mí?</span><h2 className="section-title mt-3">Fit con Aurena es para ti si...</h2></ScrollReveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((p, i) => (<ScrollReveal key={p.title} delay={i * 60}><div className="flex gap-4 p-5 rounded-2xl" style={{ background: "#fff", border: "1px solid #E5E7EB" }}><span className="text-3xl flex-shrink-0">{p.icon}</span><div><h3 className="font-bold text-ink mb-1">{p.title}</h3><p className="text-sm text-ink-muted">{p.description}</p></div></div></ScrollReveal>))}
          </div>
        </div>
      </section>

      <section className="section-py text-white text-center" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">¿Preparada para empezar?</h2>
            <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>30 días gratis. Sin tarjeta. Sin riesgo. Sin excusas.</p>
            <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 font-semibold cursor-pointer rounded-xl" style={{ padding: "18px 40px", fontSize: "16px", background: "white", color: "#EC4899" }}>Ver planes y precios<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
