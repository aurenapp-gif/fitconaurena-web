"use client";

import { useState } from "react";

/* Reproductor de YouTube con "facade": muestra solo la miniatura + botón de play
 * y NO carga el iframe (ni scripts de YouTube) hasta que se pulsa. Así la página
 * se mantiene rápida aunque haya varios vídeos. */
export default function YouTubeFacade({
  id,
  title,
  vertical = false,
}: {
  id: string;
  title?: string;
  vertical?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#252525] bg-black ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
      {open ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={title || "Vídeo"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={title ? `Reproducir: ${title}` : "Reproducir vídeo"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1CA0E3] text-white shadow-[0_8px_30px_rgba(28,160,227,0.4)] transition group-hover:scale-110">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
