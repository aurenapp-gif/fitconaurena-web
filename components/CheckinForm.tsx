"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image";
import type { Ejercicio } from "@/lib/entreno";

const PHOTOS = [
  { field: "photo_front", label: "Frente" },
  { field: "photo_side", label: "Perfil" },
  { field: "photo_back", label: "Espaldas" },
] as const;

// Orden de arriba abajo del cuerpo, para que sea fácil ir midiendo en orden.
const MEASURES = [
  { field: "chest", label: "Pecho" },
  { field: "back", label: "Espalda" },
  { field: "arm", label: "Brazo" },
  { field: "waist", label: "Cintura" },
  { field: "hips", label: "Cadera" },
  { field: "glute", label: "Glúteo" },
  { field: "thigh", label: "Cuádriceps" },
] as const;

/**
 * Formulario de la revisión.
 *
 * Con `plegado`, en vez del formulario entero se enseña un solo botón «Subir
 * mi revisión» y el formulario aparece al pulsarlo: en móvil, un formulario
 * abierto de entrada empuja el progreso fuera de la pantalla. La primera vez
 * (sin ninguna revisión) va abierto: no hay nada más que ver.
 *
 * `ejercicios` son los del plan de entrenamiento vigente, prerrellenados con
 * lo que apuntó en la revisión anterior: solo cambia lo que haya cambiado.
 */
export default function CheckinForm({ plegado = false, ejercicios = [] }: { plegado?: boolean; ejercicios?: Ejercicio[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(!plegado);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [showMeasures, setShowMeasures] = useState(false);
  const [entreno, setEntreno] = useState<{ name: string; weight: string; reps: string }[]>(
    ejercicios.map((e) => ({ name: e.name, weight: e.weight != null ? String(e.weight) : "", reps: e.reps != null ? String(e.reps) : "" }))
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [celebrate, setCelebrate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    const anyPhoto = Object.values(files).some(Boolean);
    const anyMeasure = Object.values(measures).some((v) => v.trim() !== "");
    const entrenoLleno = entreno.filter((x) => x.weight.trim() !== "" || x.reps.trim() !== "");
    if (!weight && !note && !anyPhoto && !anyMeasure && entrenoLleno.length === 0) {
      setStatus("error");
      setMessage("Añade al menos peso, medidas, entrenamiento, nota o foto.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setCelebrate("");
    try {
      const fd = new FormData();
      fd.append("weight", weight);
      fd.append("note", note);
      for (const m of MEASURES) {
        const v = (measures[m.field] ?? "").trim();
        if (v) fd.append(m.field, v);
      }
      if (entrenoLleno.length) {
        fd.append("exercises", JSON.stringify(entrenoLleno.map((x) => ({ name: x.name, weight: x.weight.trim() || null, reps: x.reps.trim() || null }))));
      }
      for (const p of PHOTOS) {
        const f = files[p.field];
        if (f) fd.append(p.field, await resizeImage(f));
      }
      const res = await fetch("/api/miembros/checkin", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo guardar.");
        return;
      }
      setWeight("");
      setNote("");
      setFiles({});
      setMeasures({});
      formRef.current?.reset();
      setStatus("idle");
      // Celebración de hito si el servidor la indica.
      if (typeof data.celebrate === "string" && data.celebrate) setCelebrate(data.celebrate);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          // Que el formulario quede a la vista nada más abrirse.
          setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }}
        className="btn-brand text-[17px] w-full !min-h-[50px]"
      >
        Subir mi revisión
      </button>
    );
  }

  const campo = "rounded-[11px] bg-page px-4 py-3 text-[17px] text-ink placeholder:text-ink-subtle outline-none focus:ring-2 focus:ring-brand/40";
  const campoChico = "w-full rounded-[9px] bg-page px-3 py-2 text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:ring-2 focus:ring-brand/40 text-right";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface rounded-[14px] p-4 sm:p-5 scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[17px] font-semibold text-ink">Tu revisión</h3>
        {plegado && (
          <button type="button" onClick={() => setAbierto(false)} className="text-[15px] text-ink-muted min-h-[40px] px-2">Cerrar</button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-[11px] bg-page p-4">
          <p className="text-[15px] font-semibold text-ink mb-0.5">Tres fotos: frente, perfil y espaldas</p>
          <p className="text-[13px] text-ink-muted mb-3">
            Siempre en el mismo sitio y con la misma luz. Solo las veis tú y tu coach.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PHOTOS.map((p) => (
              <label key={p.field} className="flex flex-col items-center gap-1.5 cursor-pointer text-center">
                <span className="text-[13px] text-ink">{p.label}</span>
                <span className={`w-full rounded-[9px] min-h-[44px] flex items-center justify-center text-[13px] ${files[p.field] ? "bg-success-soft text-success font-semibold" : "bg-surface text-ink-muted"}`}>
                  {files[p.field] ? "Lista" : "Elegir"}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setFiles((f) => ({ ...f, [p.field]: e.target.files?.[0] ?? null }))} />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <input
            type="number" step="0.1" inputMode="decimal" value={weight}
            onChange={(e) => setWeight(e.target.value)} placeholder="Peso en kg (opcional)" aria-label="Peso en kg (opcional)"
            className={campo}
          />
          <p className="text-[13px] text-ink-muted px-1">
            Si te pesas, en ayunas. Si prefieres no pesarte, déjalo en blanco: tu progreso se sigue viendo con las fotos y las medidas.
          </p>
        </div>

        <div className="rounded-[11px] bg-page p-4">
          <button
            type="button"
            onClick={() => setShowMeasures((s) => !s)}
            className="w-full flex items-center justify-between gap-2 text-left min-h-[28px]"
          >
            <span className="text-[15px] font-semibold text-ink">Medidas en cm (opcional)</span>
            <span className="text-brand text-[15px]">{showMeasures ? "Ocultar" : "Añadir"}</span>
          </button>
          {showMeasures && (
            <>
              <p className="text-[13px] text-ink-muted mt-1 mb-3">
                Cuando la báscula no se mueve, las medidas demuestran que sí avanzas. Mídete relajada y siempre igual.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEASURES.map((m) => (
                  <label key={m.field} className="flex flex-col gap-1">
                    <span className="text-[13px] text-ink-muted">{m.label}</span>
                    <input
                      type="number" step="0.1" inputMode="decimal"
                      value={measures[m.field] ?? ""}
                      onChange={(e) => setMeasures((v) => ({ ...v, [m.field]: e.target.value }))}
                      placeholder="cm" aria-label={`${m.label} en cm`}
                      className={`${campoChico} bg-surface text-left`}
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {entreno.length > 0 && (
          <div className="rounded-[11px] bg-page p-4">
            <p className="text-[15px] font-semibold text-ink mb-0.5">Tu entrenamiento</p>
            <p className="text-[13px] text-ink-muted mb-3">
              Para cada ejercicio, el peso y las repeticiones de tu mejor serie estas semanas. Viene rellenado con la revisión anterior: cambia solo lo que haya cambiado.
            </p>
            <div className="flex flex-col divide-y divide-line">
              {entreno.map((x, i) => (
                <div key={x.name} className="flex items-center gap-2 py-2">
                  <span className="flex-1 min-w-0 text-[15px] text-ink truncate">{x.name}</span>
                  <label className="flex items-center gap-1 w-[92px] shrink-0">
                    <input type="number" step="0.5" inputMode="decimal" value={x.weight} aria-label={`${x.name}: peso en kg`} placeholder="kg"
                      onChange={(e) => setEntreno((arr) => arr.map((y, j) => (j === i ? { ...y, weight: e.target.value } : y)))} className={`${campoChico} bg-surface`} />
                    <span className="text-[13px] text-ink-muted">kg</span>
                  </label>
                  <label className="flex items-center gap-1 w-[92px] shrink-0">
                    <input type="number" step="1" inputMode="numeric" value={x.reps} aria-label={`${x.name}: repeticiones`} placeholder="reps"
                      onChange={(e) => setEntreno((arr) => arr.map((y, j) => (j === i ? { ...y, reps: e.target.value } : y)))} className={`${campoChico} bg-surface`} />
                    <span className="text-[13px] text-ink-muted">rep</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="¿Cómo te has sentido estas semanas? (opcional)" aria-label="Nota"
          className={`${campo} resize-none`}
        />
        {status === "error" && <p role="alert" className="text-[15px] text-danger">{message}</p>}
        {celebrate && (
          <p className="text-[15px] font-semibold text-success bg-success-soft rounded-[11px] px-4 py-3">
            {celebrate}
          </p>
        )}
        <button type="submit" disabled={status === "loading"} className="btn-brand text-[17px] w-full !min-h-[50px] disabled:opacity-60">
          {status === "loading" ? "Guardando…" : "Guardar mi revisión"}
        </button>
      </div>
    </form>
  );
}
