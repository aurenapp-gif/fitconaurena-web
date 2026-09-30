"use client";

import { useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string; node: React.ReactNode; aviso?: boolean };

/**
 * Secciones del perfil como control segmentado (Planes · Hábitos · Cuestionario…).
 *
 * Recibe el contenido ya renderizado de cada pestaña. La activa se refleja en
 * la URL (`?tab=habitos`) sin recargar, para que un enlace desde el inicio
 * pueda abrir directamente la sección que toca y para que «atrás» no pierda
 * dónde estaba.
 */
export default function PerfilTabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0]?.id);
  const barra = useRef<HTMLDivElement>(null);

  // Con cinco pestañas no caben todas en un móvil estrecho: la fila se
  // desplaza. Si la que está abierta es una del medio, se trae a la vista al
  // entrar; si no, se abriría una pestaña que no se ve.
  useEffect(() => {
    const el = barra.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  function elegir(id: string) {
    setActive(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url.toString());
    } catch { /* sin URL no pasa nada: la pestaña cambia igual */ }
  }

  return (
    <div>
      <div
        ref={barra}
        role="tablist"
        aria-label="Secciones del perfil"
        className="flex gap-0.5 p-1 rounded-xl bg-line mb-4 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => elegir(t.id)}
              className={`flex-1 min-h-[36px] px-1.5 sm:px-2.5 rounded-[9px] text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                on ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.aviso && (
                <span aria-label="pendiente" className="ml-1 inline-block w-[7px] h-[7px] rounded-full bg-warn align-middle" />
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
        >
          {t.node}
        </div>
      ))}
    </div>
  );
}
