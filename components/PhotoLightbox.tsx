"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = { label: string; url: string; thumb: string };

/** Miniaturas de check-in que se abren en un visor a pantalla completa (en vez
 * de en una pestaña nueva). Soporta varias fotos con anterior/siguiente. */
export default function PhotoLightbox({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const close = useCallback(() => setIdx(null), []);
  const prev = useCallback(() => setIdx((i) => (i == null ? i : (i + photos.length - 1) % photos.length)), [photos.length]);
  const next = useCallback(() => setIdx((i) => (i == null ? i : (i + 1) % photos.length)), [photos.length]);

  useEffect(() => {
    if (idx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [idx, close, prev, next]);

  return (
    <>
      <div className="flex gap-3 flex-wrap mb-1">
        {photos.map((p, i) => (
          <button key={i} type="button" onClick={() => setIdx(i)} className="text-center" aria-label={`Ver ${p.label}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.label} loading="lazy" decoding="async" className="max-h-44 rounded-lg border border-[#252525] hover:border-[#CAFF00]/50 transition-colors" />
            <span className="block text-[10px] text-[#666666] mt-1">{p.label}</span>
          </button>
        ))}
      </div>

      {idx != null && (
        <div onClick={close} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button onClick={close} aria-label="Cerrar" className="absolute top-3 right-4 text-white/80 hover:text-white text-4xl leading-none">×</button>
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Anterior" className="absolute left-2 sm:left-5 text-white/80 hover:text-white text-5xl leading-none">‹</button>
          )}
          <figure onClick={(e) => e.stopPropagation()} className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[idx].url} alt={photos[idx].label} className="max-w-[92vw] max-h-[85vh] rounded-lg object-contain" />
            <figcaption className="text-xs text-[#A0A0A0] mt-2">{photos[idx].label}</figcaption>
          </figure>
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Siguiente" className="absolute right-2 sm:right-5 text-white/80 hover:text-white text-5xl leading-none">›</button>
          )}
        </div>
      )}
    </>
  );
}
