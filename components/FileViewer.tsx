"use client";

import { useEffect, useState } from "react";

/** Abre un archivo (PDF/imagen) en un visor a pantalla completa dentro de la
 * app, en vez de mandar a una pestaña/Drive. Mantiene "Abrir en pestaña" como
 * salida para los que el navegador no pueda incrustar (p. ej. Word). */
export default function FileViewer({ url, label, buttonText = "Ver plan" }: { url: string; label: string; buttonText?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-brand text-sm px-5 py-2.5 mt-2 inline-flex">
        {buttonText}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/90 flex flex-col p-3 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-white font-bold text-sm truncate">{label}</span>
            <div className="flex items-center gap-4 shrink-0">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold">Abrir en pestaña ↗</a>
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
