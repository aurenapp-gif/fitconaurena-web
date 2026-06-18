"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Topic } from "@/lib/forum";

/** Gestión de temáticas del foro (solo coach): crear y borrar. */
export default function ForumTopicManager({ topics }: { topics: Topic[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await fetch("/api/miembros/foro/temas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, position: topics.length }),
    }).catch(() => {});
    setName(""); setBusy(false); router.refresh();
  }

  async function del(id: number) {
    if (!confirm("¿Borrar esta temática? Las preguntas quedan sin temática (no se borran).")) return;
    await fetch(`/api/miembros/foro/temas?id=${id}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="card-dark p-5 !transform-none mb-4">
      <h3 className="font-bold text-white text-sm mb-3">Temáticas (solo tú)</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {topics.length === 0 && <span className="text-xs text-[#666666]">Aún no hay temáticas. Crea las primeras (Nutrición, Entrenamiento…).</span>}
        {topics.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 text-xs rounded-full border border-[#252525] bg-[#141414] px-3 py-1.5 text-white">
            {t.name}
            <button type="button" onClick={() => del(t.id)} aria-label={`Borrar ${t.name}`} className="text-[#666666] hover:text-[#FF6B6B]">×</button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva temática (ej. Nutrición)" maxLength={60}
          className="flex-1 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]" />
        <button type="submit" disabled={busy} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">Añadir</button>
      </form>
    </div>
  );
}
