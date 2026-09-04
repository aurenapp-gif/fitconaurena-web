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
        <label className="block text-xs text-ink-muted mb-1">Próxima renovación del plan</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-line bg-page px-4 py-2.5 text-sm text-ink outline-none focus:border-brand" />
      </div>
      <button onClick={save} disabled={status === "loading"} className="btn-brand text-sm px-5 py-2.5 disabled:opacity-60">
        {status === "loading" ? "…" : "Guardar"}
      </button>
      {status === "saved" && <span className="text-sm text-brand">✓</span>}
      {status === "error" && <span className="text-sm text-danger">Error</span>}
    </div>
  );
}
