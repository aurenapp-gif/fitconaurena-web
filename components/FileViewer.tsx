"use client";

import { useEffect, useState } from "react";

/**
 * Visor de un archivo del plan (PDF, Word o imagen).
 *
 * IMPORTANTE: en móvil NO se incrusta en un iframe. Safari/Chrome de iPhone y
 * Android no saben mostrar un PDF dentro de un iframe: lo pintan ampliado, sin
 * scroll y sin poder descargarlo. Ahí abrimos el visor nativo del sistema, que
 * sí permite hacer zoom, pasar páginas y guardar. En escritorio, donde el
 * incrustado funciona bien, se mantiene el visor dentro de la app.
 *
 * Además siempre se ofrece "Descargar" (Supabase fuerza la descarga con el
 * parámetro `download`, conservando el nombre original del archivo).
 */
export default function FileViewer({ url, label, buttonText = "Ver plan" }: { url: string; label: string; buttonText?: string }) {
  const [open, setOpen] = useState(false);
  // Por defecto asumimos móvil (lo más común entre las clientas): así, si el
  // JS de detección no llega a ejecutarse, el botón abre el visor nativo, que
  // funciona en todas partes, en vez de un iframe que podría fallar.
  const [canEmbed, setCanEmbed] = useState(false);

  useEffect(() => {
    const isTouch = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isNarrow = window.matchMedia("(max-width: 900px)").matches;
    setCanEmbed(!isTouch && !isNarrow);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const downloadUrl = `${url}${url.includes("?") ? "&" : "?"}download`;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mt-2">
        {canEmbed ? (
          <button type="button" onClick={() => setOpen(true)} className="btn-brand text-sm px-5 py-2.5 inline-flex">
            {buttonText}
          </button>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 inline-flex">
            {buttonText}
          </a>
        )}
        <a href={downloadUrl} className="text-[#1CA0E3] text-sm font-semibold">Descargar</a>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/90 flex flex-col p-3 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-white font-bold text-sm truncate">{label}</span>
            <div className="flex items-center gap-4 shrink-0">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold">Abrir en pestaña ↗</a>
              <a href={downloadUrl} className="text-[#1CA0E3] text-sm font-semibold">Descargar</a>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-white/80 hover:text-white text-3xl leading-none">×</button>
            </div>
          </div>
          <iframe
            onClick={(e) => e.stopPropagation()}
            src={url}
            title={label}
            className="flex-1 w-full rounded-lg bg-white"
          />
        </div>
      )}
    </>
  );
}
