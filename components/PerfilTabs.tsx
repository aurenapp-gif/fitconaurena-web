"use client";

import { useState } from "react";

type Tab = { id: string; icon: string; label: string; node: React.ReactNode };

/* Navegación por pestañas dentro de Perfil (Datos · Hábitos · Ajustes).
 * Recibe el contenido ya renderizado de cada pestaña como slots. */
export default function PerfilTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 transition-all ${
                on ? "border-[#CAFF00] bg-[#CAFF00]/10" : "border-[#252525] bg-[#141414] hover:border-[#CAFF00]/40"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className={`text-xs font-bold ${on ? "text-[#CAFF00]" : "text-[#A0A0A0]"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.id} className={t.id === active ? "" : "hidden"}>
          {t.node}
        </div>
      ))}
    </div>
  );
}
