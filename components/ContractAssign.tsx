"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ContractTemplate } from "@/lib/contract";

type Props = {
  memberEmail: string;
  templates: ContractTemplate[];   // solo activas
  assignments: { id: string; template_id: string; status: "pendiente" | "firmado" }[];
  exempt: boolean;                 // clienta anterior a la firma obligatoria
};

/**
 * Panel para la coach dentro de la ficha de una clienta: elige qué contrato le
 * asigna. El anexo de salud (si hay uno activo) se asigna automáticamente al
 * asignar cualquier contrato, no hace falta seleccionarlo.
 *
 * Si la clienta está EXENTA (ya estaba dentro antes de implantar la firma
 * obligatoria) puede seguir usando la app sin firmar nada. La coach puede
 * exigirle la firma más adelante, por ejemplo al renovar.
 */
export default function ContractAssign({ memberEmail, templates, assignments, exempt }: Props) {
  const router = useRouter();
  const contratos = useMemo(() => templates.filter((t) => t.kind === "contrato"), [templates]);
  const anexo = useMemo(() => templates.find((t) => t.kind === "anexo_salud"), [templates]);

  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.template_id)), [assignments]);
  const contratoAsignado = contratos.find((c) => assignedIds.has(c.id));
  const contratoAssignment = contratoAsignado ? assignments.find((a) => a.template_id === contratoAsignado.id) : undefined;
  const anexoAssignment = anexo ? assignments.find((a) => a.template_id === anexo.id) : undefined;

  const [selected, setSelected] = useState<string>(contratoAsignado?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function assign() {
    if (!selected) { setErr("Elige un contrato."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/miembros/contrato/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberEmail, templateId: selected }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "No se pudo asignar."); return; }
      router.refresh();
    } catch { setErr("Error de conexión."); }
    finally { setBusy(false); }
  }

  async function unassign(assignmentId: string) {
    if (!confirm("¿Retirar esta asignación? Solo funciona si aún está pendiente.")) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/miembros/contrato/asignar?id=${encodeURIComponent(assignmentId)}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "No se pudo retirar."); return; }
      router.refresh();
    } catch { setErr("Error de conexión."); }
    finally { setBusy(false); }
  }

  async function setExempt(value: boolean) {
    const msg = value
      ? "¿Eximir a esta clienta? Podrá usar la app sin firmar nada."
      : "¿Exigirle la firma? La próxima vez que entre no podrá usar la app hasta firmar los documentos que le asignes.";
    if (!confirm(msg)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/miembros/contrato/exencion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberEmail, exempt: value }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "No se pudo guardar."); return; }
      router.refresh();
    } catch { setErr("Error de conexión."); }
    finally { setBusy(false); }
  }

  const exemptBanner = (
    <div className={`rounded-xl border p-4 ${exempt ? "border-line bg-page" : "border-brand/30 bg-brand/5"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">
            {exempt ? "Exenta de firma obligatoria" : "Firma obligatoria activada"}
          </p>
          <p className="text-xs text-ink-muted mt-0.5 max-w-lg">
            {exempt
              ? "Ya estaba dada de alta antes de implantar la firma. Entra a su área privada sin firmar nada; si le asignas un contrato podrá firmarlo, pero de forma voluntaria."
              : "No podrá usar la app hasta firmar los documentos que le asignes."}
          </p>
        </div>
        <button type="button" onClick={() => setExempt(!exempt)} disabled={busy}
          className="text-xs font-bold px-4 py-2 rounded-lg border border-line text-ink-muted hover:border-brand/40 hover:text-ink transition-colors shrink-0 disabled:opacity-40">
          {exempt ? "Exigir firma" : "Eximir"}
        </button>
      </div>
    </div>
  );

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {exemptBanner}
        <div className="rounded-xl border border-line bg-page p-4">
          <p className="text-sm text-ink-muted">
            Aún no has subido ninguna plantilla de contrato. Súbelas desde el <strong className="text-ink">Panel de la coach</strong> para poder asignarlas.
          </p>
        </div>
        {err && <p className="text-xs text-danger">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {exemptBanner}
      <div>
        <label className="block text-xs text-ink-muted mb-1.5">Contrato asignado</label>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">— Elige un contrato —</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={assign}
            disabled={busy || !selected || selected === contratoAsignado?.id}
            className="btn-brand text-sm px-6 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Asignando…" : contratoAsignado ? "Cambiar" : "Asignar"}
          </button>
        </div>

        {contratoAsignado && contratoAssignment && (
          <div className="mt-3 rounded-lg border border-line px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                <span className="font-bold">{contratoAsignado.title}</span>
                <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${contratoAssignment.status === "firmado" ? "bg-brand text-white" : "bg-warn/20 text-warn border border-warn/40"}`}>
                  {contratoAssignment.status === "firmado" ? "✍️ firmado" : "⏳ pendiente"}
                </span>
              </p>
            </div>
            {contratoAssignment.status === "pendiente" && (
              <button type="button" onClick={() => unassign(contratoAssignment.id)} disabled={busy}
                className="text-xs text-danger font-bold shrink-0 hover:opacity-80 disabled:opacity-40">
                Retirar
              </button>
            )}
          </div>
        )}
      </div>

      {anexo && (
        <div>
          <label className="block text-xs text-ink-muted mb-1.5">Anexo de salud (común a todas)</label>
          <div className="rounded-lg border border-line px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm text-ink min-w-0">
              <span className="font-bold">{anexo.title}</span>
              {anexoAssignment ? (
                <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${anexoAssignment.status === "firmado" ? "bg-brand text-white" : "bg-warn/20 text-warn border border-warn/40"}`}>
                  {anexoAssignment.status === "firmado" ? "✍️ firmado" : "⏳ pendiente"}
                </span>
              ) : (
                <span className="ml-2 text-[10px] text-ink-subtle">se asigna al asignar cualquier contrato</span>
              )}
            </p>
            {anexoAssignment?.status === "pendiente" && (
              <button type="button" onClick={() => unassign(anexoAssignment.id)} disabled={busy}
                className="text-xs text-danger font-bold shrink-0 hover:opacity-80 disabled:opacity-40">
                Retirar
              </button>
            )}
          </div>
        </div>
      )}

      {!anexo && (
        <p className="text-xs text-warn">
          Aún no has subido la plantilla del anexo de salud. Súbela desde el panel de la coach para que se asigne automáticamente.
        </p>
      )}

      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
