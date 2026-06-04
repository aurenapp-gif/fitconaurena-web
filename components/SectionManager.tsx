"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Section = { id: number; name: string; position: number };

export default function SectionManager({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function call(method: string, body: object) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/miembros/contenido/secciones", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "No se pudo guardar.");
      } else {
        router.refresh();
      }
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await call("POST", { name: newName.trim() });
    setNewName("");
  }

  return (
    <div className="card-dark p-6 !transform-none border-[#CAFF00]/30 mb-6">
      <h3 className="font-bold text-white mb-1">Secciones (admin)</h3>
      <p className="text-sm text-[#A0A0A0] mb-4">Organiza el contenido por fases. La primera es la que verán como &quot;empieza por aquí&quot;.</p>

      <div className="flex flex-col gap-2 mb-4">
        {sections.length === 0 && <p className="text-sm text-[#666666]">Aún no hay secciones. Crea la primera abajo.</p>}
        {sections.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-[#252525] bg-[#0A0A0A] px-3 py-2">
            <span className="text-xs text-[#666666] w-6 shrink-0">{i + 1}.</span>
            <input
              defaultValue={s.name}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name) call("PATCH", { id: s.id, name: v }); }}
              className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none focus:text-[#CAFF00]"
              aria-label={`Nombre de la sección ${s.name}`}
            />
            <button type="button" disabled={busy || i === 0} onClick={() => call("PATCH", { id: s.id, dir: "up" })} className="text-[#A0A0A0] disabled:opacity-30 px-1" aria-label="Subir">▲</button>
            <button type="button" disabled={busy || i === sections.length - 1} onClick={() => call("PATCH", { id: s.id, dir: "down" })} className="text-[#A0A0A0] disabled:opacity-30 px-1" aria-label="Bajar">▼</button>
            <button type="button" disabled={busy} onClick={() => { if (confirm(`¿Borrar la sección "${s.name}"? El contenido no se borra, queda sin sección.`)) call("DELETE", { id: s.id }); }} className="text-[#FF6B6B] px-1" aria-label="Borrar">✕</button>
          </div>
        ))}
      </div>

      <form onSubmit={create} className="flex gap-2 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva sección (ej. Mentalidad)"
          maxLength={60}
          className="flex-1 min-w-[180px] rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]"
        />
        <button type="submit" disabled={busy} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">Añadir sección</button>
      </form>
      {msg && <p className="text-sm text-[#FF6B6B] mt-2">{msg}</p>}
    </div>
  );
}
