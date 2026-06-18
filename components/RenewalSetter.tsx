"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RenewalSetter({ member, current }: { member: string; current?: string }) {
  const router = useRouter();
  const [date, setDate] = useState(current ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");

  async function save() {
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/miembros/clientas/renovacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, date }),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    } catch { setStatus("error"); }
  }

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs text-[#A0A0A0] mb-1">Próxima renovación del plan</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#1CA0E3]" />
      </div>
      <button onClick={save} disabled={status === "loading"} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">
        {status === "loading" ? "…" : "Guardar"}
      </button>
      {status === "saved" && <span className="text-sm text-[#1CA0E3]">✓</span>}
      {status === "error" && <span className="text-sm text-[#FF6B6B]">Error</span>}
    </div>
  );
}
