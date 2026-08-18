"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUSES, type DudaStatus } from "@/lib/dudas";

type Props = {
  id: string;
  answer: string | null;
  answerUrl: string | null;
  status: DudaStatus;
  hidden: boolean;
};

/**
 * Panel de la coach sobre una duda: responder, dejar el enlace del vídeo donde
 * lo explica, marcar para qué momento la deja, y ocultarla o borrarla.
 *
 * Se abre plegado para que la lista se pueda leer de un vistazo.
 */
export default function DudaAnswer({ id, answer, answerUrl, status, hidden }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(answer ?? "");
  const [url, setUrl] = useState(answerUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send(patch: Record<string, unknown>, confirmMsg?: string) {
    if (busy) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/miembros/dudas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error ?? "No se pudo guardar."); return; }
      setMsg("Guardado.");
      router.refresh();
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm("¿Borrar esta duda? No se puede deshacer.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/miembros/dudas?id=${id}`, { method: "DELETE" });
      if (!res.ok) { setMsg("No se pudo borrar."); return; }
      router.refresh();
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  const cls = "w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline text-xs px-4 py-2 self-start">
        {answer || answerUrl ? "Editar respuesta" : "Responder"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[#1CA0E3]/30 bg-[#0A0A0A] p-4 flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Tu respuesta. La verán todas, así que responde en general, sin señalar a nadie."
        aria-label="Respuesta"
        className={cls}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enlace donde lo explicas (vídeo, grabación de la llamada…)"
        aria-label="Enlace de la respuesta"
        className={cls}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#666666]">Marcar como:</span>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => send({ status: s.id })}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors disabled:opacity-60 ${
              status === s.id ? "text-white" : "border-[#252525] text-[#A0A0A0] hover:text-white"
            }`}
            style={status === s.id ? { borderColor: s.color, background: `${s.color}22`, color: s.color } : undefined}
          >
            {s.label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-[#1CA0E3]">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ answer: text, answer_url: url })}
          className="btn-brand text-xs px-5 py-2.5 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar respuesta"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline text-xs px-4 py-2.5">
          Cerrar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ hidden: !hidden })}
          className="btn-outline text-xs px-4 py-2.5 disabled:opacity-60"
        >
          {hidden ? "Volver a mostrar" : "Ocultar a las clientas"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="text-xs font-bold text-[#FF6B6B] px-4 py-2.5 disabled:opacity-60"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
