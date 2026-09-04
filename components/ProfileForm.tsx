"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PROFILE_FIELDS,
  REQUIRED_QUESTIONNAIRE,
  questionnaireComplete,
  errorNacimiento,
  rangoNacimiento,
  type Questionnaire,
} from "@/lib/profile";
import { resizeImage } from "@/lib/image";

export default function ProfileForm({
  initialName,
  initialQuestionnaire,
  photoUrl,
  admin = false,
  submitted = false,
}: {
  initialName: string;
  initialQuestionnaire: Questionnaire;
  photoUrl?: string;
  admin?: boolean;
  submitted?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [q, setQ] = useState<Questionnaire>(initialQuestionnaire);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sent, setSent] = useState(submitted);

  const errFecha = errorNacimiento(q.fecha_nacimiento);
  const isComplete = questionnaireComplete(q) && !errFecha;
  // El navegador ya acota el calendario, pero el `min`/`max` no impide teclear
  // a mano: la comprobación de arriba es la que manda.
  const rango = rangoNacimiento();
  // Las que respondieron al cuestionario anterior solo tienen la edad. Se les
  // pide la fecha, pero no se les bloquea nada por no ponerla.
  const pideFecha = !(q.fecha_nacimiento ?? "").trim() && !!(q.edad ?? "").trim();

  function set(id: string, v: string) {
    setQ((p) => ({ ...p, [id]: v }));
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", await resizeImage(file));
      const res = await fetch("/api/miembros/perfil/foto", { method: "POST", body: fd });
      if (res.ok) router.refresh();
    } finally {
      setPhotoBusy(false);
    }
  }

  // submit=false → solo guarda los datos. submit=true → "Enviar cuestionario":
  // marca el cuestionario como enviado y arranca el ciclo de avisos del plan.
  async function save(submit: boolean) {
    if (status === "saving") return;
    // Una fecha mal tecleada no se guarda ni como borrador: acabaría en la ficha
    // de la coach como una edad falsa y con toda la pinta de ser correcta.
    if (errFecha) {
      setStatus("error");
      setMsg(errFecha);
      return;
    }
    setStatus("saving");
    setMsg("");
    try {
      const res = await fetch("/api/miembros/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name, questionnaire: q, submitted: submit }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("error");
        setMsg(d.error ?? "No se pudo guardar.");
        return;
      }
      setStatus("saved");
      if (submit) setSent(true);
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Error de conexión.");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="flex flex-col gap-6">
      {/* Foto + nombre */}
      <div className="card-dark p-6 !transform-none flex items-center gap-5 flex-wrap">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-2 border border-line flex items-center justify-center shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Tu foto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🙂</span>
          )}
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-ink-muted mb-1">Nombre (cómo te verán en la comunidad)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} maxLength={60} />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
              <span className="rounded-lg bg-brand text-white font-bold px-3 py-1.5 text-xs">{photoBusy ? "Subiendo…" : "Cambiar foto"}</span>
              <input type="file" accept="image/*" className="hidden" disabled={photoBusy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            </label>
            {admin && (
              <>
                <button type="submit" disabled={status === "saving"} className="btn-brand text-xs px-4 py-2 disabled:opacity-60">
                  {status === "saving" ? "Guardando…" : "Guardar nombre"}
                </button>
                {status === "saved" && <span className="text-sm text-brand">Guardado ✓</span>}
                {status === "error" && <span className="text-sm text-danger">{msg}</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cuestionario (solo clientas) */}
      {!admin && (
      <div className="card-dark p-6 !transform-none">
        <h3 className="font-bold text-ink mb-1">Tu cuestionario</h3>
        <p className="text-sm text-ink-muted mb-5">
          Rellena tus datos y pulsa <strong className="text-ink">Enviar cuestionario</strong>. Así tu coach
          empieza a preparar tu plan personalizado.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_FIELDS.map((f) => (
            <div key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="block text-xs text-ink-muted mb-1">{f.label}</label>
              {f.type === "select" ? (
                <select value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className={inputCls}>
                  <option value="">Selecciona…</option>
                  {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              ) : f.type === "date" ? (
                <input
                  type="date"
                  value={q[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                  min={rango.min}
                  max={rango.max}
                  className={`${inputCls} [color-scheme:dark]`}
                />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={q[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className={inputCls} />
              )}
              {f.id === "fecha_nacimiento" && errFecha ? (
                <p className="text-xs text-danger mt-1">{errFecha}</p>
              ) : f.id === "fecha_nacimiento" && pideFecha ? (
                <p className="text-xs text-brand mt-1">
                  Antes nos dijiste que tenías {q.edad} años. Pon tu fecha exacta: tu coach ajusta mejor tu plan.
                </p>
              ) : f.hint ? (
                <p className="text-xs text-ink-subtle mt-1">{f.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
        {sent ? (
          <div className="mt-5 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
            <p className="text-sm font-bold text-brand">✓ Cuestionario enviado</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Tu coach ya está preparando tu plan. Puedes seguir actualizando tus datos cuando quieras.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button type="button" onClick={() => save(false)} disabled={status === "saving"} className="btn-outline text-sm px-5 py-2.5 disabled:opacity-60">
                {status === "saving" ? "Guardando…" : "Guardar cambios"}
              </button>
              {status === "saved" && <span className="text-sm text-brand">Guardado ✓</span>}
              {status === "error" && <span className="text-sm text-danger">{msg}</span>}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => save(false)} disabled={status === "saving"} className="btn-outline text-sm px-5 py-2.5 disabled:opacity-60">
                {status === "saving" ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={status === "saving" || !isComplete}
                title={isComplete ? "" : "Completa todos los campos obligatorios para enviar"}
                className="btn-brand text-sm px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "saving" ? "Enviando…" : "Enviar cuestionario"}
              </button>
              {status === "saved" && <span className="text-sm text-brand">Guardado ✓</span>}
              {status === "error" && <span className="text-sm text-danger">{msg}</span>}
            </div>
            {!isComplete && (
              <p className="text-xs text-ink-subtle mt-2">
                Para enviar, completa: {REQUIRED_QUESTIONNAIRE.map((k) => PROFILE_FIELDS.find((f) => f.id === k)?.label ?? k).join(", ")}.
              </p>
            )}
          </div>
        )}
      </div>
      )}
    </form>
  );
}
