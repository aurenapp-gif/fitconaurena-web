import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import FAQAccordion from "@/components/FAQAccordion";
import StatsCounter from "@/components/StatsCounter";

export const metadata: Metadata = {
  title: "Fit con Aurena — Servicio 1:1 de Nutrición y Entrenamiento para Mujeres",
  description: "Consigue tu objetivo con un servicio personalizado 1:1. App con seguimiento del ciclo menstrual, planes de nutrición y entrenamiento adaptados a ti. +400 mujeres ya transformadas.",
};

const pillars = [
  {
    icon: "🎯",
    title: "Acompañamiento 1:1",
    desc: "No eres un número. Cada mujer tiene un plan diseñado específicamente para ella y ajustado mes a mes según su progreso.",
    items: ["Seguimiento personalizado contigo", "Ajustes mensuales según tu evolución", "Guía en cada paso del proceso"],
  },
  {
    icon: "🌙",
    title: "App con ciclo menstrual",
    desc: "La app se adapta a tu ciclo. Registra tu menstruación y recibe recomendaciones de ejercicio y recetas según tu fase hormonal.",
    items: ["Ejercicios adaptados a cada fase", "Recetas por fase del ciclo", "Notificaciones de energía estimada"],
  },
  {
    icon: "🥗",
    title: "Nutrición real",
    desc: "Sin alimentos prohibidos. Planes de alimentación que se adaptan a tu vida, tus gustos y tu objetivo.",
    items: ["Planes de alimentación personalizados", "Sin restricciones absurdas", "Recetas fáciles y prácticas"],
  },
];

const forWhom = [
  { emoji: "✅", text: "Llevas tiempo sin ver resultados y no sabes qué estás haciendo mal" },
  { emoji: "✅", text: "Quieres cuidarte pero sin dietas restrictivas ni planes genéricos" },
  { emoji: "✅", text: "Necesitas que alguien te guíe y te acompañe de verdad, no solo una app" },
  { emoji: "✅", text: "Tu ciclo menstrual afecta a tu energía y quieres entrenar en consecuencia" },
  { emoji: "✅", text: "Buscas un cambio real y sostenible, no una solución temporal" },
  { emoji: "✅", text: "Quieres flexibilidad para entrenar cuando y donde puedas" },
];

const notForWhom = [
  { emoji: "❌", text: "Buscas resultados sin esfuerzo ni constancia" },
  { emoji: "❌", text: "Quieres solo una app de ejercicios genérica sin guía" },
  { emoji: "❌", text: "No estás dispuesta a comprometerte con el proceso" },
];

const includes = [
  { icon: "👩‍💼", title: "Servicio 1:1", desc: "Acompañamiento personalizado con seguimiento real de tu progreso" },
  { icon: "🌙", title: "Ciclo menstrual", desc: "App que adapta ejercicios y recetas a cada fase de tu ciclo" },
  { icon: "🥗", title: "Nutrición personalizada", desc: "Plan de alimentación adaptado a ti, tus gustos y tu objetivo" },
  { icon: "🏋️", title: "Entrenamiento adaptado", desc: "Rutinas diseñadas para tu nivel, objetivo y tiempo disponible" },
  { icon: "📱", title: "App iOS & Android", desc: "Accede a tu plan desde cualquier lugar, cuando quieras" },
  { icon: "📊", title: "Seguimiento de progreso", desc: "Registra tu evolución y ve los resultados semana a semana" },
  { icon: "🔄", title: "Ajustes mensuales", desc: "Tu plan evoluciona contigo cada mes según tus resultados" },
  { icon: "🔔", title: "Notificaciones inteligentes", desc: "Te avisamos de tu energía estimada según tu fase del ciclo" },
];

const testimonials = [
  {
    name: "Clienta — Madrid",
    result: "-8 kg en 4 meses",
    text: "Llevaba años intentando perder peso sin resultados. Con Aurena por fin tengo un plan que se adapta a mí y a mis circunstancias. El seguimiento 1:1 marca la diferencia total.",
    stars: 5,
    initials: "R.M.",
    color: "#F472B6",
  },
  {
    name: "Clienta — Barcelona",
    result: "Recomposición completa en 5 meses",
    text: "Lo que más me sorprendió fue lo de las fases del ciclo. Por primera vez entiendo por qué hay semanas que tengo más energía y semanas que no. Mi entrenamiento ahora tiene sentido.",
    stars: 5,
    initials: "A.G.",
    color: "#EC4899",
  },
  {
    name: "Clienta — Sevilla",
    result: "+Fuerza y bienestar en 3 meses",
    text: "Nunca había tenido tanta constancia. El hecho de que sea un servicio personalizado y no una app genérica hace que no lo abandones. Aurena lo cambia todo.",
    stars: 5,
    initials: "L.P.",
    color: "#F59E0B",
  },
];

const faqs = [
  { q: "¿Qué es exactamente el servicio de Aurena?", a: "Es un servicio personalizado 1:1 en el que te guiamos para conseguir tu objetivo. Incluye un plan de entrenamiento y nutrición adaptado a ti, seguimiento mensual de tu progreso y acceso a la app con funcionalidad de ciclo menstrual." },
  { q: "¿Cómo funciona el seguimiento del ciclo menstrual?", a: "En la app puedes registrar tu ciclo. A partir de ahí, la app te recomienda tipos de ejercicio y recetas según tu fase hormonal (menstrual, folicular, ovulación, lútea), y te notifica los días en que tu energía estimada será mayor o menor." },
  { q: "¿Necesito ir al gimnasio?", a: "No. Los planes se adaptan a lo que tienes disponible: casa, gimnasio o ambos. Tú decides." },
  { q: "¿Cuánto tiempo necesito dedicar?", a: "Desde 30 minutos al día. El plan se adapta a tu disponibilidad real, no a un ideal imposible." },
  { q: "¿Los planes de nutrición tienen alimentos prohibidos?", a: "No. Trabajamos con lo que te gusta y lo que tienes a mano. Sin restricciones absurdas ni listas de alimentos prohibidos." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin permanencia. Cancelas desde tu perfil en cualquier momento sin coste adicional." },
  { q: "¿Es para cualquier nivel de condición física?", a: "Sí. El plan parte de tu nivel actual, sea cual sea. El servicio está diseñado para mujeres en cualquier punto de su proceso." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 30%, rgba(244,114,182,0.12) 0%, transparent 60%)" }} />
        <div className="container-wide relative z-10 py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-pink-dark" style={{ background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#F472B6" }} />
                +400 mujeres ya transformadas · ⭐⭐⭐⭐⭐ Upstore
              </div>
            </div>
            <h1 className="font-black leading-tight mb-6 text-ink" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: "1.05" }}>
              Tu objetivo,{" "}
              <span style={{ background: "linear-gradient(135deg, #F472B6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>con guía real.</span>
            </h1>
            <p className="mb-8 leading-relaxed text-ink-muted" style={{ fontSize: "clamp(1rem, 1.8vw, 1.25rem)", maxWidth: "600px" }}>
              Servicio personalizado 1:1 que combina un plan de entrenamiento y nutrición adaptado a ti, con una app que entiende tu ciclo menstrual y ajusta tus recomendaciones cada mes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link href="/tarifas" className="btn-primary text-base px-8 py-4">Ver planes <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
              <Link href="/que-es" className="btn-secondary text-base px-8 py-4">Cómo funciona</Link>
            </div>
            <div className="flex flex-wrap gap-8">
              {[
                { value: 400, suffix: "+", label: "Mujeres activas" },
                { value: 5, suffix: "★", label: "Valoración Upstore", decimals: 0 },
                { value: 100, suffix: "%", label: "Seguimiento 1:1" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-black text-ink" style={{ fontSize: "2rem", lineHeight: "1" }}>
                    <StatsCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                  </div>
                  <div className="text-xs mt-1 text-ink-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Credibility bar */}
      <section className="py-8 border-b border-gray-100" style={{ background: "#FAFAF8" }}>
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {[
              { icon: "⭐", text: "5★ en Upstore" },
              { icon: "👩", text: "+400 mujeres" },
              { icon: "🎯", text: "Servicio 1:1" },
              { icon: "🌙", text: "App con ciclo menstrual" },
              { icon: "❌", text: "Sin contratos" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 pillars */}
      <section className="py-24">
        <div className="container-wide">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="section-label">Por qué Aurena funciona</span>
              <h2 className="section-title mb-4">Tres pilares para una <span style={{ color: "#F472B6" }}>transformación real</span></h2>
              <p className="section-subtitle max-w-content mx-auto">No otra app genérica. Un servicio diseñado para mujeres que quieren resultados reales con acompañamiento real.</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((pillar, i) => (
              <ScrollReveal key={pillar.title} delay={i * 100}>
                <div className="card h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4" style={{ background: "rgba(244,114,182,0.1)" }}>{pillar.icon}</div>
                  <h3 className="font-bold text-ink text-lg mb-2">{pillar.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed mb-4">{pillar.desc}</p>
                  <ul className="flex flex-col gap-2">{pillar.items.map((item) => (<li key={item} className="check-item"><span className="check-icon">✓</span><span>{item}</span></li>))}</ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="py-24" style={{ background: "#FFF0F5" }}>
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <span className="section-label">¿Es para mí?</span>
              <h2 className="section-title mb-6">Aurena es para ti si...</h2>
              <ul className="flex flex-col gap-4">{forWhom.map((item) => (<li key={item.text} className="flex items-start gap-3"><span className="text-lg flex-shrink-0">{item.emoji}</span><span className="text-ink-soft leading-snug">{item.text}</span></li>))}</ul>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="rounded-2xl p-8" style={{ background: "#FCE7F3", border: "1px solid rgba(244,114,182,0.2)" }}>
                <h3 className="text-ink font-bold text-lg mb-6">Puede que <span style={{ color: "#F59E0B" }}>no sea para ti</span> si...</h3>
                <ul className="flex flex-col gap-4 mb-8">{notForWhom.map((item) => (<li key={item.text} className="flex items-start gap-3"><span className="text-lg flex-shrink-0">{item.emoji}</span><span className="text-sm leading-snug text-ink-muted">{item.text}</span></li>))}</ul>
                <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", color: "#6B7280" }}>
                  Si estás dispuesta a comprometerte, nosotras nos comprometemos contigo.
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Includes */}
      <section className="py-24">
        <div className="container-wide">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="section-label">Todo incluido</span>
              <h2 className="section-title mb-4">Todo lo que necesitas, <span style={{ color: "#F472B6" }}>en un solo lugar</span></h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {includes.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 60}>
                <div className="card text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-bold text-ink text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-wide">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>Resultados reales</span>
              <h2 className="section-title-white mb-4">Lo que dicen nuestras <span style={{ color: "#FCE7F3" }}>mujeres</span></h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 100}>
                <div className="card-dark h-full flex flex-col">
                  <div className="flex gap-1 mb-4">{Array.from({ length: t.stars }).map((_, j) => (<span key={j} style={{ color: "#F59E0B" }}>★</span>))}</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start mb-4" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>🏆 {t.result}</div>
                  <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>{t.initials}</div>
                    <div>
                      <div className="text-white font-semibold text-sm">{t.name}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="text-center mt-10">
              <Link href="/testimonios" className="btn-ghost-white text-sm">Ver más casos de éxito <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container-content">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="section-label">Sin letra pequeña</span>
              <h2 className="section-title mb-4">Un precio justo, <span style={{ color: "#F472B6" }}>acceso total</span></h2>
              <p className="section-subtitle">Menos de lo que gastas en cafés al mes. Sin permanencia, cancela cuando quieras.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="card text-center">
                <div className="text-xs font-bold tracking-widest uppercase text-ink-muted mb-4">Básico</div>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-4xl font-black text-ink">€24,99</span>
                  <span className="text-ink-muted text-sm mb-1">/mes</span>
                </div>
                <p className="text-xs text-ink-muted mb-6">€0,83/día · Cancela cuando quieras</p>
                <Link href="/tarifas" className="btn-secondary w-full text-sm">Empezar ahora</Link>
              </div>
              <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)", border: "2px solid #EC4899", boxShadow: "0 0 40px rgba(244,114,182,0.35)" }}>
                <div className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>Más popular</div>
                <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>Premium</div>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-4xl font-black text-white">€59,99</span>
                  <span className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>/mes</span>
                </div>
                <div className="text-xs font-semibold mb-6" style={{ color: "#FCE7F3" }}>€2/día · Seguimiento 1:1 completo</div>
                <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 w-full text-sm px-6 py-3 rounded-xl font-semibold cursor-pointer" style={{ background: "white", color: "#EC4899" }}>
                  Ver plan Premium <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <p className="text-center text-sm text-ink-muted mt-6">¿Quieres el plan anual? <Link href="/tarifas" className="font-semibold" style={{ color: "#EC4899" }}>Ver todos los planes →</Link></p>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24" style={{ background: "#FFF0F5" }}>
        <div className="container-content">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="section-label">FAQ</span>
              <h2 className="section-title mb-4">Preguntas frecuentes</h2>
            </div>
          </ScrollReveal>
          <FAQAccordion faqs={faqs} />
          <ScrollReveal>
            <div className="text-center mt-10">
              <p className="text-sm text-ink-muted mb-4">¿No encontraste tu respuesta?</p>
              <Link href="/contacto" className="btn-secondary text-sm">Contacta con nosotras</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-narrow text-center">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Sin contratos · Sin permanencia
            </div>
            <h2 className="text-white font-black leading-tight mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: "1.1" }}>¿Lista para empezar de verdad?</h2>
            <p className="mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}>+400 mujeres ya están consiguiendo sus objetivos con Aurena. Tu turno.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-xl font-semibold cursor-pointer" style={{ background: "white", color: "#EC4899" }}>
                Ver planes <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/que-es" className="btn-ghost-white text-base px-8 py-4">Saber más primero</Link>
            </div>
            <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.6)" }}>📱 App iOS &amp; Android · 🌙 Ciclo menstrual · ❌ Sin permanencia</p>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
