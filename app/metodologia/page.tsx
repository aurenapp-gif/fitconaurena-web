import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Metodología | Fit con Aurena — El método que funciona",
  description: "Descubre la metodología científica de Fit con Aurena: periodización progresiva, nutrición por fases y seguimiento continuo para resultados duraderos.",
};

const phases = [
  { phase: "Fase 1", weeks: "Semanas 1–4", title: "Activación y base", color: "#F472B6", bg: "rgba(244,114,182,0.08)", icon: "🌱", description: "Establecemos los cimientos. Aprenderás los patrones de movimiento correctos, ajustaremos tu nutrición sin pasarte hambre y fijaremos tu ritmo sostenible.", items: ["Evaluación de movilidad y fuerza base", "Calibración calórica personal", "Patrones de movimiento fundamentales", "Hábitos de sueño y recuperación", "Primera semana de adaptación progresiva"] },
  { phase: "Fase 2", weeks: "Semanas 5–8", title: "Progresión y carga", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: "⚡", description: "Aumentamos la intensidad de forma progresiva. Tu cuerpo ya está adaptado; ahora es el momento de empujar. Los resultados se vuelven visibles en esta fase.", items: ["Incremento de carga y volumen", "Ajuste de macros según progreso", "Introducción de técnicas avanzadas", "Optimización del timing nutricional", "Medición de fuerza y composición corporal"] },
  { phase: "Fase 3", weeks: "Semanas 9–12", title: "Optimización y consolidación", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", icon: "🏆", description: "Alcanzamos el pico del programa y consolidamos los resultados. Ajustes finos, máximo rendimiento y transición a un estilo de vida sostenible.", items: ["Periodización de alta intensidad", "Estrategias de mantenimiento a largo plazo", "Plan de continuación personalizado", "Evaluación final de composición corporal", "Roadmap para los próximos 3 meses"] },
];

const principles = [
  { icon: "📊", title: "Periodización progresiva", description: "Los entrenamientos evolucionan semana a semana. Sobrecarga progresiva controlada para máxima adaptación sin lesiones." },
  { icon: "🧬", title: "Nutrición de precisión", description: "Macros calculados según tu metabolismo basal, nivel de actividad y objetivo. Nada de dietas milagro. Ciencia aplicada." },
  { icon: "😴", title: "Recuperación como pilar", description: "El músculo no crece en el gym, sino mientras duermes. Protocolos de descanso y gestión del estrés incluidos en tu plan." },
  { icon: "🔄", title: "Adaptación continua", description: "Tu plan cambia cada semana según tus resultados. Si te estancas, tu coach detecta el problema y ajusta antes de que notes el bloqueo." },
  { icon: "🧠", title: "Psicología del hábito", description: "El 80% del éxito es mental. Técnicas de motivación, gestión de recaídas y construcción de identidad saludable incluidas." },
  { icon: "📈", title: "Datos y métricas", description: "Lo que no se mide, no se mejora. Registro de peso, repeticiones, bienestar y energía para decisiones basadas en datos reales." },
];

const results = [
  { icon: "⚡", stat: "87%", label: "de los usuarios reportan más energía en la primera semana" },
  { icon: "💪", stat: "94%", label: "completan el programa de 12 semanas" },
  { icon: "📉", stat: "−8,4 kg", label: "pérdida media de peso en las primeras 12 semanas" },
  { icon: "🏆", stat: "4.8/5", label: "valoración media del programa" },
];

export default function MetodologiaPage() {
  return (
    <main>
      <section className="pt-28 pb-20" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>El método</span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-6 leading-tight text-ink">No es motivación,<br className="hidden sm:block" />{" "}<span style={{ color: "#F472B6" }}>es sistema</span></h1>
            <p className="text-lg leading-relaxed mb-8 max-w-xl text-ink-muted">Hemos destilado años de investigación en fisiología del ejercicio y nutrición deportiva en un sistema que cualquier persona puede seguir y que realmente funciona.</p>
            <Link href="/tarifas" className="btn-primary" style={{ padding: "16px 32px" }}>Empezar el programa<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-12 bg-white border-b border-gray-100">
        <div className="container-wide">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {results.map((r) => (<div key={r.label} className="text-center p-4"><div className="text-3xl mb-2">{r.icon}</div><div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: "#F472B6" }}>{r.stat}</div><div className="text-xs text-ink-muted leading-snug">{r.label}</div></div>))}
          </div>
        </div>
      </section>

      <section className="section-py bg-cream">
        <div className="container-content">
          <ScrollReveal><span className="section-label">El programa</span><h2 className="section-title mt-3">12 semanas, 3 fases, resultados reales</h2><p className="section-subtitle">Cada fase tiene un propósito específico. La progresión es la clave.</p></ScrollReveal>
          <div className="mt-14 flex flex-col gap-8">
            {phases.map((phase, i) => (
              <ScrollReveal key={phase.phase} delay={i * 100}>
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${phase.color}33` }}>
                  <div className="p-1" style={{ background: phase.color }} />
                  <div className="p-6 sm:p-8" style={{ background: phase.bg }}>
                    <div className="flex flex-wrap items-start gap-4 mb-4">
                      <span className="text-4xl">{phase.icon}</span>
                      <div>
                        <div className="flex items-center gap-3 mb-1"><span className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${phase.color}22`, color: phase.color }}>{phase.phase} · {phase.weeks}</span></div>
                        <h3 className="text-xl font-black text-ink">{phase.title}</h3>
                      </div>
                    </div>
                    <p className="text-ink-muted leading-relaxed mb-5">{phase.description}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {phase.items.map((item) => (<li key={item} className="flex items-start gap-2 text-sm"><svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={phase.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg><span className="text-ink">{item}</span></li>))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py bg-white">
        <div className="container-wide">
          <ScrollReveal><span className="section-label">Fundamentos</span><h2 className="section-title mt-3">Los 6 pilares científicos</h2><p className="section-subtitle">No inventamos nada. Aplicamos lo que la ciencia ya sabe que funciona.</p></ScrollReveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {principles.map((p, i) => (<ScrollReveal key={p.title} delay={i * 60}><div className="card h-full"><div className="text-4xl mb-4">{p.icon}</div><h3 className="font-bold text-ink mb-2">{p.title}</h3><p className="text-sm text-ink-muted leading-relaxed">{p.description}</p></div></ScrollReveal>))}
          </div>
        </div>
      </section>

      <section className="section-py text-white text-center" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Empieza tu transformación hoy</h2>
            <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>El mejor momento para empezar fue hace 6 meses. El segundo mejor momento es ahora.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 font-semibold cursor-pointer rounded-xl" style={{ padding: "18px 40px", fontSize: "16px", background: "white", color: "#EC4899" }}>Ver planes y precios<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
              <Link href="/testimonios" className="btn-ghost-white" style={{ padding: "18px 40px", fontSize: "16px" }}>Ver resultados</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
