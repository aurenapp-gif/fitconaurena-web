"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminCheckinReply({ id }: { id: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function send() {
    if (status === "loading" || !reply.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/miembros/checkin/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reply }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setReply("");
      setStatus("idle");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="Responder a este check-in…"
        className="rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3] resize-none"
      />
      <button onClick={send} disabled={status === "loading"} className="btn-brand text-xs px-4 py-2 self-start disabled:opacity-60">
        {status === "loading" ? "Enviando…" : "Responder"}
      </button>
      {status === "error" && <span className="text-xs text-[#FF6B6B]">No se pudo enviar.</span>}
    </div>
  );
}
