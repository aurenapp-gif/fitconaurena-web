"use client";

import { useState } from "react";

type Tab = { id: string; icon: string; label: string; node: React.ReactNode };

/* Navegación por pestañas dentro de Perfil (Datos · Hábitos · Ajustes).
 * Recibe el contenido ya renderizado de cada pestaña como slots. */
export default function PerfilTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones del perfil"
        className="grid gap-2 mb-6"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
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
              onClick={() => setActive(t.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-all ${
                on ? "border-brand bg-brand/10" : "border-line bg-page hover:border-brand/40"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className={`text-[11px] sm:text-xs font-bold ${on ? "text-brand" : "text-ink-muted"}`}>{t.label}</span>
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
