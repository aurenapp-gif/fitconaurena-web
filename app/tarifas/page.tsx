import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import FAQAccordion from "@/components/FAQAccordion";

export const metadata: Metadata = {
  title: "Precios | Fit con Aurena — Elige tu plan",
  description: "Servicio personalizado 1:1 desde €24,99/mes. Sin permanencia. Plan básico, premium mensual y premium anual. Cancela cuando quieras.",
};

const plans = [
  {
    name: "Básico",
    priceLabel: "€24,99",
    period: "mes",
    badge: null as string | null,
    highlighted: false,
    cta: "Empezar ahora",
    totalLabel: null as string | null,
    originalPrice: null as string | null,
    perDay: "€0,83/día",
    features: [
      "App iOS & Android",
      "Seguimiento del ciclo menstrual",
      "Recomendaciones de ejercicio por fase",
      "Recetas adaptadas a tu ciclo",
      "Notificaciones de energía estimada",
      "Plan de nutrición básico",
      "Seguimiento de progreso",
    ],
    missing: ["Acompañamiento 1:1 personalizado", "Ajustes mensuales contigo", "Entrenamiento personalizado"],
  },
  {
    name: "Premium",
    priceLabel: "€59,99",
    period: "mes",
    originalPrice: null,
    badge: "MÁS POPULAR",
    highlighted: true,
    cta: "Empezar Premium",
    totalLabel: null as string | null,
    perDay: "€2/día",
    features: [
      "Todo lo del plan Básico",
      "Acompañamiento 1:1 personalizado",
      "Plan de entrenamiento adaptado a ti",
      "Plan de nutrición completo",
      "Ajustes mensuales según tu progreso",
      "Seguimiento semanal de resultados",
      "Entrenamiento personalizado (+€9,99/mes opcional)",
    ],
    missing: [],
  },
  {
    name: "Premium Anual",
    priceLabel: "€54,50",
    period: "mes",
    badge: "AHORRA €65/AÑO",
    highlighted: false,
    cta: "Empezar Premium Anual",
    totalLabel: "Facturado anualmente: €654/año",
    perDay: "€1,79/día",
    originalPrice: "€59,99",
    features: [
      "Todo lo del plan Premium",
      "Precio reducido vs mensual",
      "Acompañamiento 1:1 personalizado",
      "Plan de entrenamiento adaptado a ti",
      "Plan de nutrición completo",
      "Ajustes mensuales según tu progreso",
      "Entrenamiento personalizado (+€9,99/mes opcional)",
    ],
    missing: [],
  },
];

const faqs = [
  { q: "¿Hay permanencia?", a: "No. Puedes cancelar en cualquier momento desde la app, sin coste adicional. Sin letra pequeña, sin penalizaciones." },
  { q: "¿Qué diferencia hay entre el plan Básico y Premium?", a: "El plan Básico incluye acceso a la app con seguimiento del ciclo menstrual, recomendaciones automáticas y planes de nutrición base. El plan Premium añade acompañamiento 1:1 personalizado, un plan de entrenamiento diseñado para ti y ajustes mensuales según tu progreso real." },
  { q: "¿Qué incluye el entrenamiento personalizado opcional?", a: "Por €9,99/mes adicionales en el plan Premium, diseñamos tu rutina de entrenamiento completamente a medida: ejercicios, series, repeticiones y progresión adaptados a tu nivel, objetivo y disponibilidad." },
  { q: "¿Puedo cambiar de plan más adelante?", a: "Sí, puedes subir o bajar de plan en cualquier momento. Los cambios se aplican al siguiente ciclo de facturación." },
  { q: "¿Qué métodos de pago aceptáis?", a: "Aceptamos todas las tarjetas de crédito/débito (Visa, Mastercard, Amex) y PayPal." },
  { q: "¿El plan anual tiene ventajas adicionales?", a: "Además del ahorro económico (€65 al año respecto al mensual), el plan anual incluye las mismas características que el Premium mensual. Es la opción para quienes están comprometidas con su proceso a largo plazo." },
];

const comparison = [
  ["Precio mensual", "~€50", "€60–200", "Gratis–€10", "€24,99–€59,99"],
  ["Servicio 1:1 personalizado", "❌", "✅", "❌", "✅ Premium"],
  ["Ciclo menstrual", "❌", "❌", "Raro", "✅"],
  ["Nutrición incluida", "❌", "Raro", "❌", "✅"],
  ["Ajustes mensuales", "❌", "✅", "❌", "✅ Premium"],
  ["App móvil", "❌", "❌", "✅", "✅"],
  ["Sin desplazamientos", "❌", "❌", "✅", "✅"],
  ["Sin permanencia", "❌", "❌", "✅", "✅"],
];

export default function TarifasPage() {
  return (
    <main>
      {/* Hero */}
      <section className="pt-28 pb-16 text-center" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>
              Planes y precios
            </span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-4 leading-tight text-ink">
              La inversión más rentable<br className="hidden sm:block" />{" "}
              <span style={{ color: "#F472B6" }}>que harás en ti</span>
            </h1>
            <p className="text-lg max-w-lg mx-auto text-ink-muted">
              Desde €0,83/día. Sin permanencia. Cancela cuando quieras.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing cards */}
      <section id="planes" className="section-py bg-cream">
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={plan.highlighted ? {
                  background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)",
                  border: "2px solid #EC4899",
                  boxShadow: "0 0 40px rgba(244,114,182,0.3)",
                  padding: "32px",
                  borderRadius: "16px",
                } : {
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  padding: "32px",
                  borderRadius: "16px",
                }}
              >
                {plan.badge ? (
                  <div className="mb-4">
                    <span className="text-xs font-bold tracking-widest px-3 py-1 rounded-full" style={{
                      background: plan.highlighted ? "rgba(255,255,255,0.2)" : "rgba(244,114,182,0.12)",
                      color: plan.highlighted ? "#fff" : "#EC4899",
                    }}>
                      {plan.badge}
                    </span>
                  </div>
                ) : (
                  <div className="h-8" />
                )}
                <h3 className="text-xl font-bold mb-2" style={{ color: plan.highlighted ? "#fff" : "#0D1117" }}>{plan.name}</h3>
                <div className="flex items-end gap-2 mb-1">
                  {plan.originalPrice && (
                    <span className="text-lg line-through" style={{ color: plan.highlighted ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}>{plan.originalPrice}</span>
                  )}
                  <span className="text-5xl font-black" style={{ color: plan.highlighted ? "#fff" : "#0D1117" }}>{plan.priceLabel}</span>
                  <span className="text-sm mb-2" style={{ color: plan.highlighted ? "rgba(255,255,255,0.8)" : "#6B7280" }}>/{plan.period}</span>
                </div>
                <p className="text-xs mb-1" style={{ color: plan.highlighted ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}>{plan.perDay}</p>
                {plan.totalLabel ? (
                  <p className="text-xs mb-5" style={{ color: plan.highlighted ? "rgba(255,255,255,0.7)" : "#9CA3AF" }}>{plan.totalLabel}</p>
                ) : (
                  <div className="mb-5" />
                )}
                <Link
                  href="https://app.fitconaurena.com/register"
                  className={plan.highlighted ? "" : "btn-secondary"}
                  style={plan.highlighted ? {
                    display: "block",
                    textAlign: "center",
                    padding: "14px 24px",
                    marginBottom: "24px",
                    fontSize: "14px",
                    background: "white",
                    color: "#EC4899",
                    borderRadius: "12px",
                    fontWeight: "600",
                  } : {
                    display: "block",
                    textAlign: "center",
                    padding: "14px 24px",
                    marginBottom: "24px",
                    fontSize: "14px",
                  }}
                >
                  {plan.cta}
                </Link>
                <ul className="flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.highlighted ? "rgba(255,255,255,0.9)" : "#F472B6"} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      <span style={{ color: plan.highlighted ? "#fff" : "#0D1117" }}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      <span style={{ color: "#9CA3AF" }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-ink-muted mt-8">
            ❌ Sin permanencia &nbsp;·&nbsp; Cancela cuando quieras &nbsp;·&nbsp; Planes para todos los objetivos
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section-py bg-white">
        <div className="container-content">
          <ScrollReveal>
            <span className="section-label">Comparativa</span>
            <h2 className="section-title mt-3">¿Por qué Fit con Aurena?</h2>
          </ScrollReveal>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th className="text-left py-4 pr-6 font-semibold text-ink">Característica</th>
                  <th className="py-4 px-4 text-center font-medium text-ink-muted">Gym tradicional</th>
                  <th className="py-4 px-4 text-center font-medium text-ink-muted">PT presencial</th>
                  <th className="py-4 px-4 text-center font-medium text-ink-muted">App genérica</th>
                  <th className="py-4 px-4 text-center font-bold rounded-t-lg" style={{ background: "rgba(244,114,182,0.08)", color: "#EC4899" }}>
                    Fit con Aurena
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([feat, gym, pt, app, aurena]) => (
                  <tr key={feat} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td className="py-4 pr-6 font-medium text-ink">{feat}</td>
                    <td className="py-4 px-4 text-center text-ink-muted">{gym}</td>
                    <td className="py-4 px-4 text-center text-ink-muted">{pt}</td>
                    <td className="py-4 px-4 text-center text-ink-muted">{app}</td>
                    <td className="py-4 px-4 text-center font-semibold" style={{ background: "rgba(244,114,182,0.06)", color: "#EC4899" }}>{aurena}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-py bg-cream">
        <div className="container-narrow">
          <ScrollReveal>
            <span className="section-label">Preguntas frecuentes</span>
            <h2 className="section-title mt-3">Resolvemos tus dudas sobre precios</h2>
          </ScrollReveal>
          <div className="mt-10">
            <FAQAccordion faqs={faqs} />
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-ink-muted">¿Más dudas? <Link href="/contacto" className="font-semibold" style={{ color: "#EC4899" }}>Escríbenos</Link></p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-py" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-narrow text-center">
          <h2 className="text-3xl font-black text-white mb-4">¿Lista para empezar?</h2>
          <p className="text-white/80 mb-8">Sin permanencia. Cancela cuando quieras. Tu proceso, a tu ritmo.</p>
          <Link
            href="https://app.fitconaurena.com/register"
            className="inline-flex items-center justify-center gap-2 text-base px-8 py-4 rounded-xl font-semibold"
            style={{ background: "white", color: "#EC4899" }}
          >
            Empezar ahora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
