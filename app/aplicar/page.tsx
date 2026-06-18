import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ApplicationForm from "@/components/ApplicationForm";
import SuccessCarousel from "@/components/SuccessCarousel";
import YouTubeFacade from "@/components/YouTubeFacade";
import VideoTestimonials from "@/components/VideoTestimonials";
import { VSL_URL, TESTIMONIAL_URLS, TESTIMONIALS_VERTICAL, youtubeId } from "@/lib/videos";
import { getCasosExito } from "@/lib/casos";

export const metadata: Metadata = {
  title: "Solicitud — Programa Fit con Aurena",
  // Página privada: no indexar ni seguir. Solo se entra con el enlace.
  robots: { index: false, follow: false, nocache: true },
};

export default function AplicarPage() {
  const casos = getCasosExito();
  const vslId = youtubeId(VSL_URL);
  const testimonialIds = TESTIMONIAL_URLS.map(youtubeId).filter((x): x is string => !!x);
  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden">
        {/* Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #1CA0E3 0%, transparent 70%)" }}
        />

        <div className="container-narrow relative z-10 py-16 md:py-24">
          {/* Filtro / titular */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6 border border-[#1CA0E3]/40 bg-[#1CA0E3]/10 text-[#1CA0E3] uppercase">
              Solo para mujeres de 25-40 años
            </div>
            <p className="text-[#A0A0A0] mb-6 text-sm md:text-base">
              ¿Con poco tiempo y cansada de hacer dietas?
            </p>
            <h1
              className="font-black text-white leading-[1.08] tracking-tight mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}
            >
              Te ayudo a perder <span className="text-[#1CA0E3]">+9 kg</span> en tiempo
              récord comiendo lo que te gusta
            </h1>
            <p className="section-sub max-w-lg mx-auto">
              Sin pasar hambre, ni correr, ni matarte en el gym.
            </p>
          </div>

          {/* Franja de marca: método + garantía */}
          <div className="rounded-2xl bg-[#1CA0E3] text-white text-center px-6 py-6 md:py-7 mb-12 max-w-xl mx-auto shadow-[0_8px_40px_rgba(28,160,227,0.25)]">
            <p className="font-black leading-tight mb-3" style={{ fontSize: "clamp(1.15rem, 3vw, 1.7rem)" }}>
              Con el método Fit con Aurena
            </p>
            <p className="font-extrabold text-sm md:text-base">
              ✅ Garantía de resultados bajo contrato legal:
            </p>
            <p className="font-semibold text-sm md:text-base opacity-90">
              Te acompaño hasta que lo consigas
            </p>
          </div>

          {/* VSL (vídeo de ventas), tras el titular/franja */}
          <div className="max-w-2xl mx-auto mb-12">
            <p className="text-center font-black tracking-widest uppercase mb-4 text-[#1CA0E3]"
               style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)" }}>
              Paso 1: Ver el vídeo
            </p>
            {vslId ? (
              <YouTubeFacade id={vslId} title="Vídeo de presentación" />
            ) : (
              <div className="aspect-video w-full rounded-2xl border border-[#252525] bg-gradient-to-br from-[#161616] to-[#0c0c0c] flex flex-col items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1CA0E3] text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                </span>
                <p className="text-[#666666] text-xs mt-3 uppercase tracking-widest">Vídeo muy pronto</p>
              </div>
            )}
            <p className="text-center text-sm md:text-base text-[#A0A0A0] mt-5">
              Para saber cómo lograrlo, rellena el formulario para saber si podemos ayudarte y
              agendar tu llamada gratuita, donde serás informada de cómo puedes solucionarlo
              cuanto antes.
            </p>
          </div>

          {/* Formulario de calificación */}
          <p className="text-center font-black tracking-wide uppercase mb-4 text-[#1CA0E3]"
             style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)" }}>
            Paso 2: Agendar tu llamada gratuita para comenzar tu cambio
          </p>
          <div className="card-dark p-6 md:p-10 !transform-none">
            <p className="text-center text-sm text-[#A0A0A0] mb-8">
              Responde unas preguntas rápidas para ver si encajas en el programa y agenda
              una llamada gratuita.
            </p>
            <ApplicationForm />
          </div>

          {/* Casos de éxito (debajo del cuestionario) */}
          <SuccessCarousel images={casos} />

          {/* "Esto es para ti si…" (debajo de las fotos) */}
          <div className="rounded-2xl bg-[#1CA0E3] text-white px-6 py-7 md:px-10 md:py-9 mt-14 max-w-xl mx-auto shadow-[0_8px_40px_rgba(28,160,227,0.25)]">
            <p className="font-black text-center mb-5" style={{ fontSize: "clamp(1.2rem, 3vw, 1.7rem)" }}>
              Esto es para ti si…
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                "Te has abandonado por trabajo",
                "Te has dejado de poner ropa que te gusta",
                "No vas a la playa o piscina por vergüenza",
                "Estás harta de dietas",
                "Tienes ansiedad por la comida",
                "Has sufrido el efecto rebote",
                "Lo has intentado todo y no consigues bajar de peso",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 font-semibold text-sm md:text-base">
                  <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonios en vídeo (debajo de las fotos) */}
          <VideoTestimonials ids={testimonialIds} vertical={TESTIMONIALS_VERTICAL} />
        </div>
      </main>
    </>
  );
}
