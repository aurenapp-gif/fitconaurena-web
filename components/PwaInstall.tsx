"use client";

import { useEffect, useState } from "react";

/* Explica cómo instalar la PWA en iOS y Android. Detecta la plataforma para
 * resaltar la guía relevante, pero muestra ambas. Si ya está instalada
 * (standalone), lo indica y no insiste. */
export default function PwaInstall() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
  }, []);

  const Card = ({ active, emoji, title, steps }: { active: boolean; emoji: string; title: string; steps: string[] }) => (
    <div className={`rounded-xl border p-4 ${active ? "border-brand/40 bg-brand/5" : "border-line"}`}>
      <p className="font-bold text-ink mb-2">{emoji} {title}{active && <span className="text-[10px] text-brand ml-2">tu dispositivo</span>}</p>
      <ol className="list-decimal list-inside text-sm text-ink-muted space-y-1">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );

  return (
    <div className="card-dark p-6 !transform-none">
      <h3 className="font-bold text-ink mb-1">Instala la app</h3>
      <p className="text-sm text-ink-muted mb-5">
        {installed
          ? "✅ Ya tienes la app instalada en este dispositivo."
          : "Añade Fit con Aurena a tu pantalla de inicio para abrirla como una app y recibir notificaciones."}
      </p>
      {!installed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            active={platform === "ios"}
            emoji="🍎"
            title="iPhone / iPad"
            steps={[
              "Abre esta web en Safari.",
              "Pulsa el botón Compartir (cuadrado con flecha).",
              "Elige “Añadir a pantalla de inicio”.",
              "Abre la app desde el nuevo icono.",
            ]}
          />
          <Card
            active={platform === "android"}
            emoji="🤖"
            title="Android"
            steps={[
              "Abre esta web en Chrome.",
              "Pulsa el menú (⋮) arriba a la derecha.",
              "Elige “Instalar app” o “Añadir a pantalla de inicio”.",
              "Abre la app desde el nuevo icono.",
            ]}
          />
        </div>
      )}
    </div>
  );
}
