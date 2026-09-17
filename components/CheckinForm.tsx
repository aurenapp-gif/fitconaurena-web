"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { resizeImage } from "@/lib/image";
import type { Ejercicio } from "@/lib/entreno";
import { aPunto, filtraDecimal, filtraEntero } from "@/lib/numeros";

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
export default function CheckinForm({ plegado = false, ejercicios = [], deEntrenos = 0 }: { plegado?: boolean; ejercicios?: Ejercicio[]; deEntrenos?: number }) {
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
  const [paso, setPaso] = useState(0);

  // Los pasos que le tocan. El del entreno solo existe si su plan trae
  // ejercicios; una clienta sin ellos no tiene por qué pasar por una pantalla
  // vacía.
  const PASOS = ejercicios.length > 0
    ? (["fotos", "cuerpo", "entreno", "nota"] as const)
    : (["fotos", "cuerpo", "nota"] as const);
  const actual = PASOS[Math.min(paso, PASOS.length - 1)];
  const ultimo = paso >= PASOS.length - 1;

  const TITULOS: Record<string, { t: string; s: string }> = {
    fotos: { t: "Tus tres fotos", s: "Mismo sitio y misma luz que la última vez. Solo las veis tú y tu coach." },
    cuerpo: { t: "Peso y medidas", s: "Los dos son opcionales. Si prefieres no pesarte, tu progreso se sigue viendo con las fotos." },
    entreno: { t: "Tu entrenamiento", s: "Tu mejor serie de estas semanas en cada ejercicio." },
    nota: { t: "¿Cómo ha ido?", s: "Lo que quieras contarle a tu coach. También puedes dejarlo en blanco." },
  };

  // BORRADOR. Lo escrito se guarda en ESTE móvil según se escribe, para que
  // dejarlo a medias no cueste nada. Las fotos no caben aquí, así que se
  // vuelven a elegir: se le dice, en vez de dejar que lo descubra.
  const BORRADOR = "fca_revision_borrador";
  /**
   * La primera pasada del guardado no cuenta.
   *
   * Los dos efectos corren seguidos al montar: el de leer PIDE el cambio de
   * estado, pero el de guardar se ejecuta inmediatamente después y todavía ve
   * los campos vacíos. Sin saltarse esa primera vez, abrir la revisión
   * borraba el borrador que acababa de leerse. La segunda pasada ya trae los
   * valores cargados y guarda lo correcto.
   */
  const primeraVez = useRef(true);
  useEffect(() => {
    try {
      const crudo = window.localStorage.getItem(BORRADOR);
      if (!crudo) return;
      const d = JSON.parse(crudo) as { weight?: string; note?: string; measures?: Record<string, string>; entreno?: { name: string; weight: string; reps: string }[] };
      if (typeof d.weight === "string") setWeight(d.weight);
      if (typeof d.note === "string") setNote(d.note);
      if (d.measures && typeof d.measures === "object") {
        setMeasures(d.measures);
        if (Object.values(d.measures).some((v) => v)) setShowMeasures(true);
      }
      if (Array.isArray(d.entreno)) {
        setEntreno((arr) => arr.map((x) => {
          const g = d.entreno?.find((y) => y.name === x.name);
          return g ? { ...x, weight: g.weight, reps: g.reps } : x;
        }));
      }
    } catch { /* sin borrador se empieza de cero, que no es ningún drama */ }
  }, []);

  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    try {
      window.localStorage.setItem(BORRADOR, JSON.stringify({ weight, note, measures, entreno }));
    } catch { /* en incógnito no se puede guardar; el formulario funciona igual */ }
  }, [weight, note, measures, entreno]);

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
      // La coma se traduce aquí, al salir: en pantalla ella ve lo que ha
      // escrito, y el servidor recibe un número que entiende.
      fd.append("weight", aPunto(weight));
      fd.append("note", note);
      for (const m of MEASURES) {
        const v = aPunto(measures[m.field] ?? "");
        if (v) fd.append(m.field, v);
      }
      if (entrenoLleno.length) {
        fd.append("exercises", JSON.stringify(entrenoLleno.map((x) => ({
          name: x.name,
          weight: aPunto(x.weight) || null,
          reps: x.reps.trim() || null,
        }))));
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
      // La revisión ya está enviada: el borrador de este móvil sobra.
      try { window.localStorage.removeItem(BORRADOR); } catch { /* da igual */ }
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
      <div className="flex items-center gap-3 mb-3">
        {plegado && (
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"
            className="text-[15px] text-ink-muted min-h-[40px] w-8 text-left">✕</button>
        )}
        <span className="flex-1 text-[15px] text-ink-muted text-center">Paso {paso + 1} de {PASOS.length}</span>
        <span className="w-8" />
      </div>
      <div className="flex gap-1.5 mb-5" aria-hidden="true">
        {PASOS.map((_, i) => (
          <span key={i} className={`flex-1 h-1 rounded-full ${i <= paso ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <h3 className="text-[24px] font-bold text-ink leading-tight tracking-tight">{TITULOS[actual].t}</h3>
      <p className="text-[15px] text-ink-muted mt-1.5 mb-4">{TITULOS[actual].s}</p>

      <div className="flex flex-col gap-3">
        {actual === "fotos" && (
        <div className="rounded-[11px] bg-page p-4">
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
        )}

        {actual === "cuerpo" && (
        <div className="flex flex-col gap-1">
          <input
            type="text" inputMode="decimal" value={weight}
            onChange={(e) => setWeight(filtraDecimal(e.target.value))} placeholder="Peso en kg (opcional)" aria-label="Peso en kg (opcional)"
            className={campo}
          />
          <p className="text-[13px] text-ink-muted px-1">
            Si te pesas, en ayunas. Si prefieres no pesarte, déjalo en blanco: tu progreso se sigue viendo con las fotos y las medidas.
          </p>
        </div>
        )}

        {actual === "cuerpo" && (
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
                      type="text" inputMode="decimal"
                      value={measures[m.field] ?? ""}
                      onChange={(e) => setMeasures((v) => ({ ...v, [m.field]: filtraDecimal(e.target.value) }))}
                      placeholder="cm" aria-label={`${m.label} en cm`}
                      className={`${campoChico} bg-surface text-left`}
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        )}

        {actual === "entreno" && entreno.length > 0 && (
          <div className="rounded-[11px] bg-page p-4">
            <p className="text-[13px] text-ink-muted mb-3">
              {deEntrenos > 0
                ? `Ya viene relleno con lo que apuntaste entrenando: ${deEntrenos === 1 ? "un ejercicio" : `${deEntrenos} ejercicios`} con tu mejor serie de estas semanas. Cambia solo lo que no cuadre.`
                : "Para cada ejercicio, el peso y las repeticiones de tu mejor serie estas semanas. Viene rellenado con la revisión anterior: cambia solo lo que haya cambiado."}
            </p>
            <div className="flex flex-col divide-y divide-line">
              {entreno.map((x, i) => (
                <div key={x.name} className="flex items-center gap-2 py-2">
                  <span className="flex-1 min-w-0 text-[15px] text-ink truncate">{x.name}</span>
                  <label className="flex items-center gap-1 w-[92px] shrink-0">
                    <input type="text" inputMode="decimal" value={x.weight} aria-label={`${x.name}: peso en kg`} placeholder="kg"
                      onChange={(e) => setEntreno((arr) => arr.map((y, j) => (j === i ? { ...y, weight: filtraDecimal(e.target.value) } : y)))} className={`${campoChico} bg-surface`} />
                    <span className="text-[13px] text-ink-muted">kg</span>
                  </label>
                  <label className="flex items-center gap-1 w-[92px] shrink-0">
                    <input type="text" inputMode="numeric" value={x.reps} aria-label={`${x.name}: repeticiones`} placeholder="reps"
                      onChange={(e) => setEntreno((arr) => arr.map((y, j) => (j === i ? { ...y, reps: filtraEntero(e.target.value) } : y)))} className={`${campoChico} bg-surface`} />
                    <span className="text-[13px] text-ink-muted">rep</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {actual === "nota" && (
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={4}
            placeholder="Cómo te has sentido, qué te ha costado, qué ha ido bien…" aria-label="Nota para tu coach"
            className={`${campo} resize-none`}
          />
        )}

        {status === "error" && <p role="alert" className="text-[15px] text-danger">{message}</p>}
        {celebrate && (
          <p className="text-[15px] font-semibold text-success bg-success-soft rounded-[11px] px-4 py-3">
            {celebrate}
          </p>
        )}

        <p className="text-[13px] text-ink-muted text-center mt-1">
          Puedes dejarlo a medias y seguir luego: lo que escribas se guarda en este móvil.
          {actual === "fotos" ? " Las fotos sí tendrás que volver a elegirlas." : ""}
        </p>

        <div className="flex gap-2">
          {paso > 0 && (
            <button type="button" onClick={() => setPaso((n) => n - 1)}
              className="rounded-[14px] bg-page px-5 py-4 text-[17px] text-ink min-h-[50px]">Atrás</button>
          )}
          {/*
            LAS DOS CLAVES SON IMPRESCINDIBLES.

            Sin ellas React reutiliza el mismo nodo del DOM para los dos
            botones. Al pulsar «Siguiente» en el penúltimo paso, el manejador
            cambia el paso, React convierte ese mismo botón en el de enviar
            —que es type="submit"— y el navegador, que todavía está procesando
            ese clic, ejecuta su acción por defecto: enviaba la revisión sola,
            sin que la clienta llegara a ver el último paso.
          */}
          {ultimo ? (
            <button key="enviar" type="submit" disabled={status === "loading"} className="btn-brand text-[17px] flex-1 !min-h-[50px] disabled:opacity-60">
              {status === "loading" ? "Enviando…" : "Enviar mi revisión"}
            </button>
          ) : (
            <button key="siguiente" type="button" onClick={() => setPaso((n) => n + 1)} className="btn-brand text-[17px] flex-1 !min-h-[50px]">
              Siguiente
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
