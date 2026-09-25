"use client";

import { useState } from "react";
import { fuenteDeVideo, urlDeReproductor } from "@/lib/onboarding";

/**
 * Un vídeo del onboarding.
 *
 * No se carga el reproductor hasta que ella pulsa: tres reproductores
 * arrancando a la vez dejan la página pegada en un móvil con datos, y la
 * mayoría de las veces solo va a ver uno.
 *
 * Al pulsar se deja constancia de que lo ha visto. Es lo que permite decirle
 * «te queda uno» y que su coach sepa quién ha hecho el onboarding y quién no.
 */
export default function VideoOnboarding({
  url, titulo, id, visto,
}: { url: string; titulo: string; id: string; visto?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const fuente = fuenteDeVideo(url);
  if (!fuente) return null;

  function abrir() {
    setAbierto(true);
    if (visto) return;
    fetch("/api/miembros/actividad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "onboarding_visto", detail: id }),
      keepalive: true,
    }).catch(() => { /* que lo vea es lo importante; apuntarlo, lo segundo */ });
  }

  return (
    <div className="relative overflow-hidden rounded-[14px] bg-black aspect-video">
      {abierto ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`${urlDeReproductor(fuente)}&autoplay=1`}
          title={titulo}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={abrir} className="group absolute inset-0 h-full w-full"
          aria-label={`Reproducir: ${titulo}`}>
          {fuente.plataforma === "youtube" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={`https://i.ytimg.com/vi/${fuente.id}/hqdefault.jpg`} alt="" aria-hidden="true"
              loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            /* Vimeo no da una miniatura por dirección fija como YouTube, así que
               se pinta un fondo propio en vez de pedirle nada a nadie. */
            <span className="absolute inset-0 bg-gradient-to-br from-[#0E6E9E] to-[#0A0A0A]" />
          )}
          <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_30px_rgba(28,160,227,0.4)] transition group-hover:scale-110">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
