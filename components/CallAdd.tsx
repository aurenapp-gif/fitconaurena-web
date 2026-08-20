"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_TITLE, MAX_NOTE } from "@/lib/llamadas";

/**
 * Añade la grabación de una llamada estratégica a UNA clienta concreta. Solo la
 * coach, desde la ficha de esa clienta. La clienta la verá en su perfil, en la
 * pestaña «Llamadas».
 */
export default function CallAdd({ member }: { member: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!url.trim()) { setStatus("error"); setMsg("Pega el enlace de la llamada."); return; }

    setStatus("sending"); setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/llamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, url: url.trim(), title, date, note }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(d.setup ? "Falta ejecutar el SQL en Supabase (lo tienes justo aquí abajo)." : d.error ?? "No se pudo guardar.");
        if (d.setup) router.refresh();
        return;
      }
      setUrl(""); setTitle(""); setDate(""); setNote("");
      setStatus("ok");
      setMsg("Llamada guardada. Ya le aparece en su perfil ✓");
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        inputMode="url"
        placeholder="Enlace de la grabación (https://…)"
        aria-label="Enlace de la grabación"
        className={cls}
      />
      <div className="flex gap-3 flex-wrap">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="Título (opcional): «Llamada de onboarding»…"
          aria-label="Título de la llamada"
          className={`${cls} flex-1 min-w-[200px]`}
        />
        <label className="flex flex-col gap-1">
          <span className="sr-only">Fecha de la llamada</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Fecha de la llamada"
            className={cls}
          />
        </label>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={MAX_NOTE}
        placeholder="Nota para ella (opcional): lo que acordasteis, en qué centrarse…"
        aria-label="Nota para la clienta"
        className={cls}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" disabled={status === "sending"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
          {status === "sending" ? "Guardando…" : "Guardar llamada"}
        </button>
        {msg && <span className={`text-sm ${status === "error" ? "text-[#FF6B6B]" : "text-[#1CA0E3]"}`}>{msg}</span>}
      </div>
      <p className="text-xs text-[#666666]">
        Solo la ve esta clienta. Si el enlace es de Zoom o Drive, comprueba antes que se puede abrir sin pedir permiso,
        porque ella no tiene acceso a tu cuenta.
      </p>
    </form>
  );
}
