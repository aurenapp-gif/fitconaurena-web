"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Controles de moderación de una pregunta (solo coach): resuelta, fijar, borrar.
 *  Si se pasa `replyId`, actúa como botón de borrar esa respuesta. */
export default function QuestionControls({
  id, resolved, pinned, replyId,
}: { id: string; resolved?: boolean; pinned?: boolean; replyId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(p: { resolved?: boolean; pinned?: boolean }) {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/miembros/foro/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => {});
    setBusy(false); router.refresh();
  }
  async function delQuestion() {
    if (!confirm("¿Borrar esta pregunta y todo su hilo?")) return;
    await fetch(`/api/miembros/foro/${id}`, { method: "DELETE" }).catch(() => {});
    router.push("/miembros/foro");
  }
  async function delReply() {
    if (!confirm("¿Borrar esta respuesta?")) return;
    await fetch(`/api/miembros/foro/${id}?reply=${replyId}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  const btn = "text-xs font-semibold rounded-lg border border-[#252525] px-3 py-1.5 hover:border-[#1CA0E3]/50 text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-60";

  if (replyId) {
    return <button type="button" onClick={delReply} className="text-[11px] text-[#666666] hover:text-[#FF6B6B]">Borrar</button>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => patch({ resolved: !resolved })} disabled={busy} className={btn}>
        {resolved ? "Quitar resuelta" : "Marcar resuelta ✅"}
      </button>
      <button type="button" onClick={() => patch({ pinned: !pinned })} disabled={busy} className={btn}>
        {pinned ? "Dejar de fijar" : "Fijar 📌"}
      </button>
      <button type="button" onClick={delQuestion} disabled={busy} className="text-xs font-semibold rounded-lg border border-[#FF6B6B]/40 text-[#FF6B6B] px-3 py-1.5 hover:bg-[#FF6B6B]/10 transition-colors disabled:opacity-60">
        Borrar
      </button>
    </div>
  );
}
