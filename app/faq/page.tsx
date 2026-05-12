import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import FAQAccordion from "@/components/FAQAccordion";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | Fit con Aurena",
  description: "Resolvemos todas tus dudas sobre el programa, precios, cancelación, la app y más. Si no encuentras tu respuesta, escríbenos.",
};

const categories = [
  {
    title: "Sobre el programa", icon: "💪",
    faqs: [
      { q: "¿Necesito ir al gimnasio?", a: "No es obligatorio. Puedes hacer todos los entrenamientos en casa con material mínimo (mancuernas, bandas elásticas). Si tienes gym, los planes se adaptan al equipamiento disponible." },
      { q: "¿Cuánto tiempo tengo que entrenar al día?", a: "Entre 30 y 60 minutos al día, 4-5 días a la semana según tu plan. Hay opciones de 20 minutos para días con menos tiempo." },
      { q: "¿El plan de nutrición incluye recetas?", a: "Sí. Recibes recetas semanales con instrucciones paso a paso, valores nutricionales y lista de la compra automática. Son recetas rápidas y sencillas, no de chef." },
      { q: "¿Puedo hacer el programa si tengo una lesión?", a: "Depende de la lesión. Muchas lesiones son compatibles con entrenamientos adaptados. Indícalo en el cuestionario inicial y tu coach diseñará un plan seguro." },
      { q: "¿Qué pasa si una semana lo tengo complicado?", a: "El programa es flexible. Puedes marcar una semana como 'semana tranquila' y tu coach ajusta la carga. Lo importante es no abandonar, no ser perfecto." },
    ],
  },
  {
    title: "Precios y pagos", icon: "💳",
    faqs: [
      { q: "¿Cuánto cuesta Fit con Aurena?", a: "El plan mensual cuesta €19/mes. El plan anual sale a €9/mes (facturado como €108/año). El plan Elite con coach personal dedicado cuesta €49/mes." },
      { q: "¿Cómo funciona el período de prueba?", a: "Los primeros 30 días son completamente gratis. No necesitas tarjeta de crédito para empezar. Después del día 30, si quieres continuar, introduces tu método de pago." },
      { q: "¿Qué métodos de pago aceptáis?", a: "Aceptamos Visa, Mastercard, American Express y PayPal. Los pagos se procesan de forma segura a través de Stripe." },
      { q: "¿Puedo pagar en efectivo o por transferencia?", a: "Actualmente solo aceptamos pagos online mediante tarjeta o PayPal. Esto nos permite mantenerte activo de forma inmediata y sin fricción." },
      { q: "¿Hay descuentos especiales?", a: "Sí. Tenemos descuentos para estudiantes (20%) y para grupos de amigos (15% a partir de 3 personas). Contáctanos en hola@fitconaurena.com." },
    ],
  },
  {
    title: "Cancelación y garantía", icon: "🛡️",
    faqs: [
      { q: "¿Puedo cancelar en cualquier momento?", a: "Sí, puedes cancelar cuando quieras desde la configuración de tu cuenta, en menos de 1 minuto, sin llamar a nadie ni rellenar formularios." },
      { q: "¿Qué pasa cuando cancelo?", a: "Mantienes el acceso hasta el final del período pagado. No hay penalizaciones ni cargos adicionales por cancelar." },
      { q: "¿Cómo funciona la garantía de 30 días?", a: "Si en los primeros 30 días no estás satisfecho por cualquier motivo, te devolvemos el 100% del importe. Solo tienes que escribirnos a hola@fitconaurena.com con el asunto 'Reembolso' y lo procesamos en 3-5 días laborables." },
      { q: "¿Puedo pausar mi suscripción?", a: "Sí, puedes pausar hasta 3 meses al año (plan mensual) o hasta 1 mes al año (plan anual). Solo tienes que solicitarlo con 48h de antelación." },
    ],
  },
  {
    title: "La app", icon: "📱",
    faqs: [
      { q: "¿Está disponible para iOS y Android?", a: "Sí, la app está disponible de forma gratuita en App Store y Google Play. También puedes acceder desde el navegador web en cualquier dispositivo." },
      { q: "¿Funciona sin conexión a internet?", a: "Los entrenamientos del día se pueden descargar para usar sin conexión. La nutrición, el tracking y la comunidad requieren conexión." },
      { q: "¿Puedo sincronizar con mi smartwatch o pulsera?", a: "Sí, nos integramos con Apple Health, Google Fit, Fitbit y Garmin. La sincronización es automática y en tiempo real." },
      { q: "¿Dónde están los vídeos de los ejercicios?", a: "Cada ejercicio tiene su propio vídeo HD en la app. Los vídeos son cortos (10-30 segundos), sin música molesta, con demostración clara del movimiento correcto." },
      { q: "¿Hay soporte técnico si tengo un problema con la app?", a: "Sí, nuestro equipo técnico responde en menos de 4 horas en horario laboral. Puedes contactarnos desde la propia app o en soporte@fitconaurena.com." },
    ],
  },
];

export default function FaqPage() {
  return (
    <main>
      <section className="pt-28 pb-16 text-center" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>Centro de ayuda</span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-4 leading-tight text-ink">Preguntas{" "}<span style={{ color: "#F472B6" }}>frecuentes</span></h1>
            <p className="text-lg max-w-lg mx-auto text-ink-muted">Resolvemos las dudas más comunes. Si no encuentras tu respuesta, escríbenos directamente.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-py bg-cream">
        <div className="container-narrow">
          <div className="flex flex-col gap-14">
            {categories.map((cat, i) => (
              <ScrollReveal key={cat.title} delay={i * 50}>
                <div>
                  <div className="flex items-center gap-3 mb-6"><span className="text-2xl">{cat.icon}</span><h2 className="text-xl font-black text-ink">{cat.title}</h2></div>
                  <FAQAccordion faqs={cat.faqs} />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-py bg-white">
        <div className="container-content">
          <div className="rounded-3xl p-8 sm:p-12 text-center" style={{ background: "#FFF0F5", border: "1px solid rgba(244,114,182,0.2)" }}>
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-black text-ink mb-3">¿No encontraste tu respuesta?</h2>
            <p className="text-ink-muted max-w-md mx-auto mb-6">Nuestro equipo responde en menos de 24 horas. Puedes escribirnos por email o rellenar el formulario de contacto.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/contacto" className="btn-primary" style={{ padding: "14px 28px" }}>Contactar ahora<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
              <a href="mailto:hola@fitconaurena.com" className="btn-secondary" style={{ padding: "14px 28px" }}>hola@fitconaurena.com</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section-py text-white text-center" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <h2 className="text-3xl font-black mb-4">¿Convencida? Empieza gratis hoy</h2>
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>Sin tarjeta · Sin permanencia · Garantía 30 días</p>
            <Link href="/tarifas" className="inline-flex items-center justify-center gap-2 font-semibold cursor-pointer rounded-xl" style={{ padding: "16px 36px", background: "white", color: "#EC4899" }}>Ver planes y precios<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
