"use client";

import { useState } from "react";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/leads";
import { QUESTIONS } from "@/lib/application";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function answerLabel(qid: string, value: string | undefined): string {
  if (!value) return "—";
  const q = QUESTIONS.find((x) => x.id === qid);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  nuevo: "bg-surface-2 text-ink-muted",
  contactada: "bg-brand-soft text-brand",
  agendada: "bg-brand text-white",
  cliente: "bg-success-soft text-success",
  descartada: "bg-danger-soft text-danger",
};

export default function LeadRow({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState<LeadStatus>((lead.status as LeadStatus) ?? "nuevo");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  async function save(patch: { status?: LeadStatus; notes?: string }) {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/miembros/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...patch }),
      });
      setSavedMsg(res.ok ? "Guardado ✓" : "Error al guardar");
    } catch {
      setSavedMsg("Sin conexión");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  function onStatusChange(v: LeadStatus) {
    setStatus(v);
    save({ status: v });
  }

  return (
    <div className="card-dark p-4 !transform-none">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink truncate">{lead.name || "Sin nombre"}</p>
          <p className="text-xs text-ink-muted truncate">
            <a href={`mailto:${lead.email}`} className="min-h-[40px] inline-flex items-center hover:text-brand">{lead.email}</a>
            {lead.phone ? <> · <a href={`tel:${lead.phone}`} className="min-h-[40px] inline-flex items-center hover:text-brand">{lead.phone}</a></> : null}
          </p>
          <p className="text-[10px] text-ink-subtle mt-0.5">
            {fmtDate(lead.created_at)}
            {lead.qualified === false ? " · no califica" : ""}
            {lead.call_at ? ` · llamada: ${fmtDate(lead.call_at)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.qualified ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-brand/15 text-brand">Califica</span>
          ) : null}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
            disabled={saving}
            className={`text-xs font-bold rounded-lg px-2 py-1.5 outline-none cursor-pointer ${STATUS_STYLE[status]}`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-page text-ink">{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-h-[40px] inline-flex items-center text-xs text-brand mt-1 font-semibold"
      >
        {open ? "Ocultar detalles ▲" : "Ver detalles ▼"}
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="text-xs">
                <span className="text-ink-subtle">{q.label}</span>
                <br />
                <span className="text-ink">{answerLabel(q.id, lead.answers?.[q.id])}</span>
              </div>
            ))}
          </div>
          {lead.motivacion ? (
            <div className="text-xs">
              <span className="text-ink-subtle">Motivación</span>
              <p className="text-ink whitespace-pre-wrap mt-0.5">{lead.motivacion}</p>
            </div>
          ) : null}

          <div>
            <label className="text-xs text-ink-subtle">Notas internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Apunta lo que hablasteis, próximos pasos…"
              className="mt-1 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand transition-colors"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => save({ notes })}
                disabled={saving}
                className="btn-brand text-xs px-4 py-2 disabled:opacity-60"
              >
                Guardar notas
              </button>
              {savedMsg && <span className="text-xs text-ink-muted">{savedMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
