"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContractTemplate } from "@/lib/contract";

/**
 * Listado de plantillas subidas. Solo la coach. Cada una se puede eliminar (si
 * tiene firmas asociadas, queda desactivada como histórico en vez de borrarse).
 */
export default function ContractTemplatesList({ templates }: { templates: ContractTemplate[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  async function remove(id: string, title: string) {
    if (!confirm(`¿Eliminar la plantilla "${title}"? Si ya tiene firmas quedará desactivada (no se borran las firmas).`)) return;
    setPending(id); setErr("");
    try {
      const res = await fetch(`/api/miembros/contrato/plantilla?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "No se pudo eliminar."); return; }
      router.refresh();
    } catch { setErr("Error de conexión."); }
    finally { setPending(null); }
  }

  if (templates.length === 0) {
    return <p className="text-sm text-ink-subtle">Todavía no hay plantillas. Sube la primera arriba.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {templates.map((t) => (
        <div key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${t.active ? "border-line" : "border-line opacity-60"}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.kind === "anexo_salud" ? "bg-warn text-black" : "bg-brand text-white"}`}>
                {t.kind === "anexo_salud" ? "Anexo salud" : "Contrato"}
              </span>
              {!t.active && <span className="text-[10px] text-ink-subtle">desactivada</span>}
            </div>
            <p className="text-sm font-bold text-ink truncate mt-1">{t.title}</p>
          </div>
          <button type="button" onClick={() => remove(t.id, t.title)} disabled={pending === t.id}
            className="min-h-[40px] inline-flex items-center text-xs text-danger font-bold shrink-0 hover:opacity-80 disabled:opacity-40">
            {pending === t.id ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      ))}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
