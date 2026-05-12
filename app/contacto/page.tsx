import type { Metadata } from "next";
import ScrollReveal from "@/components/ScrollReveal";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contacto | Fit con Aurena",
  description: "¿Tienes alguna duda? Escríbenos y te respondemos en menos de 24 horas. También puedes encontrarnos en redes sociales.",
};

const channels = [
  { icon: "📧", title: "Email", value: "hola@fitconaurena.com", description: "Respuesta en menos de 24h (días laborables)", href: "mailto:hola@fitconaurena.com", cta: "Enviar email" },
  { icon: "💬", title: "Chat en la app", value: "Disponible en tu cuenta", description: "Para miembros activos. Respuesta en menos de 4h en horario laboral.", href: "https://app.fitconaurena.com", cta: "Abrir app" },
  { icon: "📱", title: "Instagram", value: "@fitconaurena", description: "Síguenos para contenido diario y respuestas rápidas por DM.", href: "https://instagram.com/fitconaurena", cta: "Seguir en Instagram" },
];

const faqs = [
  { q: "¿Tenéis soporte en fin de semana?", a: "El soporte por email tiene menor tiempo de respuesta en fin de semana (hasta 48h). El chat de la app para miembros Elite está activo todos los días." },
  { q: "¿Puedo hablar con un coach antes de comprar?", a: "Sí. Envíanos un email a hola@fitconaurena.com con el asunto 'Quiero hablar con un coach' y te ponemos en contacto en 24 horas." },
  { q: "¿Cómo solicito mi reembolso de 30 días?", a: "Escríbenos a hola@fitconaurena.com con el asunto 'Reembolso' y tu email de registro. Lo procesamos en 3-5 días laborables sin preguntas." },
];

export default function ContactoPage() {
  return (
    <main>
      <section className="pt-28 pb-16 text-center" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>Contacto</span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-4 leading-tight text-ink">Estamos aquí<br className="hidden sm:block" />{" "}<span style={{ color: "#F472B6" }}>para ayudarte</span></h1>
            <p className="text-lg max-w-lg mx-auto text-ink-muted">Respuesta garantizada en menos de 24 horas. Escríbenos sin miedo.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-py bg-cream">
        <div className="container-wide">
          <ScrollReveal><span className="section-label">Canales de contacto</span><h2 className="section-title mt-3">Elige cómo quieres hablar con nosotros</h2></ScrollReveal>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {channels.map((ch, i) => (
              <ScrollReveal key={ch.title} delay={i * 80}>
                <div className="card text-center h-full flex flex-col">
                  <div className="text-4xl mb-4">{ch.icon}</div>
                  <h3 className="font-bold text-ink mb-1">{ch.title}</h3>
                  <p className="text-sm font-semibold mb-2" style={{ color: "#EC4899" }}>{ch.value}</p>
                  <p className="text-sm text-ink-muted leading-relaxed mb-5 flex-1">{ch.description}</p>
                  <a href={ch.href} target={ch.href.startsWith("http") ? "_blank" : undefined} rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined} className="btn-secondary text-sm" style={{ padding: "12px 20px" }}>{ch.cta}</a>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py bg-white">
        <div className="container-content">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-2">
              <ScrollReveal>
                <span className="section-label">Formulario</span>
                <h2 className="section-title mt-3">Escríbenos directamente</h2>
                <p className="text-ink-muted leading-relaxed mt-4">Rellena el formulario y te respondemos en menos de 24 horas. Sin automatismos, te responde una persona real.</p>
                <div className="mt-8 flex flex-col gap-4">
                  {faqs.map((faq) => (
                    <div key={faq.q} className="p-4 rounded-xl" style={{ background: "#FFF0F5", border: "1px solid rgba(244,114,182,0.15)" }}>
                      <p className="text-sm font-semibold text-ink mb-1">{faq.q}</p>
                      <p className="text-xs text-ink-muted leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
            <div className="lg:col-span-3"><ScrollReveal delay={150}><ContactForm /></ScrollReveal></div>
          </div>
        </div>
      </section>
    </main>
  );
}
