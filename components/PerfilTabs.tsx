"use client";

import { useState } from "react";

type Tab = { id: string; label: string; node: React.ReactNode };

/**
 * Secciones del perfil como control segmentado (Planes · Hábitos · Datos…).
 *
 * Recibe el contenido ya renderizado de cada pestaña. La activa se refleja en
 * la URL (`?tab=habitos`) sin recargar, para que un enlace desde el inicio
 * pueda abrir directamente la sección que toca y para que «atrás» no pierda
 * dónde estaba.
 */
export default function PerfilTabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0]?.id);

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
        role="tablist"
        aria-label="Secciones del perfil"
        className="flex gap-1 p-1 rounded-xl bg-line mb-4 overflow-x-auto"
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
              className={`flex-1 min-h-[36px] px-2 sm:px-2.5 rounded-[9px] text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                on ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
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
