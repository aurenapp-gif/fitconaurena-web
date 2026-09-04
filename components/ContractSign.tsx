"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { esObligatorio, type ContractField, type ContractKind } from "@/lib/contract";

export type ContractItem = {
  assignmentId: string;
  templateId: string;
  templateTitle: string;
  kind: ContractKind;
  templateUrl?: string;
  fields: ContractField[];
};

type Props = {
  items: ContractItem[];      // asignaciones PENDIENTES
  defaultName: string;
  defaultValues?: Record<string, string>;   // valores pre-rellenados (perfil)
};

/**
 * Pantalla de firma para la clienta. Muestra cada contrato pendiente en su
 * propia pestaña: se lee el PDF, se rellenan los campos, se dibuja la firma y
 * se envía. Al firmar todos, la clienta ya puede acceder al resto de la app.
 */
export default function ContractSign({ items, defaultName, defaultValues }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  if (items.length === 0) {
    return (
      <div className="card-dark p-6 !transform-none">
        <p className="text-sm text-ink-muted">No tienes contratos pendientes de firma. Puedes volver al área privada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {items.map((it, i) => (
            <button
              key={it.assignmentId}
              type="button"
              onClick={() => setActive(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                i === active
                  ? "bg-brand border-brand text-white"
                  : "border-line text-ink-muted hover:border-brand/40"
              }`}
            >
              {it.kind === "anexo_salud" ? "Anexo de salud" : it.templateTitle}
            </button>
          ))}
        </div>
      )}
      {/* Se montan TODOS y se oculta el inactivo con CSS. Si se desmontara al
          cambiar de pestaña, la clienta perdería lo que llevara escrito y la
          firma dibujada. El lienzo oculto mide 0×0 y se ajusta solo al mostrarse. */}
      {items.map((it, i) => (
        <div key={it.assignmentId} className={i === active ? undefined : "hidden"}>
          <ContractCard
            item={it}
            defaultName={defaultName}
            defaultValues={defaultValues}
            onSigned={() => router.refresh()}
          />
        </div>
      ))}
    </div>
  );
}

function ContractCard({
  item,
  defaultName,
  defaultValues,
  onSigned,
}: {
  item: ContractItem;
  defaultName: string;
  defaultValues?: Record<string, string>;
  onSigned: () => void;
}) {
  // Estado del formulario: strings para inputs, booleans para checkboxes.
  const initial = useMemo(() => {
    const v: Record<string, string | boolean> = {};
    for (const f of item.fields) {
      if (f.type === "checkbox") v[f.key] = false;
      // Los radios arrancan VACÍOS: nada preseleccionado.
      else if (f.type === "radio") v[f.key] = "";
      else if (f.key === "nombre_completo" && defaultName) v[f.key] = defaultName;
      else if (defaultValues?.[f.key]) v[f.key] = defaultValues[f.key];
      else v[f.key] = "";
    }
    return v;
  }, [item.fields, defaultName, defaultValues]);

  const [values, setValues] = useState<Record<string, string | boolean>>(initial);
  const [name, setName] = useState(defaultName ?? "");
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  /** Estilo del trazo. Hay que reaplicarlo tras cada cambio de tamaño, porque
   *  tocar canvas.width reinicia el contexto. */
  function applyStroke(ctx: CanvasRenderingContext2D, ratio: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#0F172A";
  }

  /**
   * Ajusta la resolución real del lienzo a su tamaño en pantalla CONSERVANDO lo
   * que haya dibujado. Es clave: asignar canvas.width borra el contenido, y el
   * lienzo se remide cada vez que la página se reajusta (al crecer un campo de
   * texto, al aparecer un aviso, o al ocultarse la barra del navegador en el
   * móvil). Sin conservar el trazo, la clienta perdía la firma sin enterarse y
   * el envío fallaba.
   */
  function sizeCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return; // aún oculta: no se puede medir
    const ratio = window.devicePixelRatio || 1;
    const targetW = Math.round(w * ratio);
    const targetH = Math.round(h * ratio);
    if (c.width === targetW && c.height === targetH) return; // ya está bien

    // Copia de lo dibujado hasta ahora, para volver a pintarlo tras redimensionar.
    let prev: HTMLCanvasElement | null = null;
    if (c.width > 0 && c.height > 0) {
      try {
        prev = document.createElement("canvas");
        prev.width = c.width; prev.height = c.height;
        prev.getContext("2d")?.drawImage(c, 0, 0);
      } catch { prev = null; }
    }

    c.width = targetW; c.height = targetH;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    applyStroke(ctx, ratio);
    if (prev) {
      try { ctx.drawImage(prev, 0, 0, w, h); } catch { /* se pierde el trazo, no el envío */ }
    }
  }

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    sizeCanvas();
    const ro = new ResizeObserver(() => sizeCanvas());
    ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ¿Hay trazo de verdad? Se mira el lienzo, no una bandera que cualquier
   *  reajuste podría dejar desincronizada. */
  function hasInk(): boolean {
    const c = canvasRef.current;
    if (!c || !c.width || !c.height) return false;
    try {
      const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] > 8) return true; // canal alfa
      }
      return false;
    } catch {
      // Si el navegador impide leer el lienzo, no bloqueamos: que decida el servidor.
      return true;
    }
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    if (!c.width || !c.height) sizeCanvas(); // solo si todavía no tiene tamaño
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    try { c.setPointerCapture(e.pointerId); } catch { /* no todos lo admiten */ }
    const { x, y } = point(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    // Un toque suelto también deja marca (una firma corta o un punto).
    ctx.lineTo(x + 0.01, y); ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e); ctx.lineTo(x, y); ctx.stroke();
  }
  function end() { drawing.current = false; }
  function clearSig() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  }

  function setField(key: string, val: string | boolean) {
    setValues((prev) => {
      const next = { ...prev, [key]: val };
      // Si cambia de «empezar ya» a «prefiero esperar», el reconocimiento de
      // pérdida del derecho deja de tener sentido y se desmarca. Si se quedara
      // marcado, se enviaría un consentimiento contradictorio que el servidor
      // rechaza, y la clienta no entendería por qué.
      for (const f of item.fields) {
        if (f.requiredIf && f.requiredIf.key === key && String(val) !== f.requiredIf.value) {
          next[f.key] = false;
        }
      }
      return next;
    });
  }

  async function submit() {
    if (status === "loading") return;
    if (name.trim().length < 3) { setStatus("error"); setMsg("Escribe tu nombre completo al firmar."); return; }
    if (!hasInk()) { setStatus("error"); setMsg("Dibuja tu firma en el recuadro."); return; }
    if (!accepted) { setStatus("error"); setMsg("Marca la casilla para aceptar y firmar."); return; }
    // Validación básica en cliente (el backend re-valida).
    for (const f of item.fields) {
      if (f.key === "detalle_afirmativas") continue;
      if (!esObligatorio(f, values)) continue;
      const v = values[f.key];
      if (f.type === "radio") {
        const permitidos = (f.options ?? []).map((o) => o.value);
        if (typeof v !== "string" || !permitidos.includes(v)) {
          setStatus("error"); setMsg("Elige cuándo quieres que empiece el servicio."); return;
        }
      } else if (f.type === "checkbox") {
        if (v !== true) { setStatus("error"); setMsg(`Falta aceptar: “${f.label}”.`); return; }
      } else if (f.type === "yesno") {
        if (v !== "si" && v !== "no") { setStatus("error"); setMsg(`Responde SÍ o NO: “${f.label}”.`); return; }
      } else {
        if (typeof v !== "string" || v.trim().length < 2) { setStatus("error"); setMsg(`Falta rellenar: “${f.label}”.`); return; }
      }
    }
    // "Detalle" obligatorio si algún SÍ.
    const anyYes = item.fields.some((f) => f.type === "yesno" && values[f.key] === "si");
    if (anyYes) {
      const det = values["detalle_afirmativas"];
      if (typeof det !== "string" || det.trim().length < 3) { setStatus("error"); setMsg("Detalla las respuestas marcadas como SÍ."); return; }
    }

    const dataUrl = canvasRef.current!.toDataURL("image/png");
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/contrato/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: item.assignmentId,
          signerName: name.trim(),
          signature: dataUrl,
          fieldValues: values,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo firmar."); return; }
      onSigned();
    } catch {
      setStatus("error"); setMsg("Error de conexión. Inténtalo de nuevo.");
    }
  }

  const inputCls = "w-full rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";
  const title = item.kind === "anexo_salud" ? "Anexo de salud" : item.templateTitle;
  const subtitle = item.kind === "anexo_salud"
    ? "Rellena tu declaración de salud y consentimiento antes de empezar."
    : "Lee el contrato, rellena tus datos y fírmalo para empezar.";

  return (
    <div className="card-dark p-6 !transform-none">
      <div className="mb-4">
        <h2 className="font-bold text-ink text-lg">{title}</h2>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </div>

      {item.templateUrl && (
        <a href={item.templateUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm px-5 py-2.5 inline-flex mb-6">
          Ver documento completo
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
        </a>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {item.fields.map((f) => {
          // El reconocimiento de pérdida del derecho solo se enseña si ha
          // elegido empezar ya: es la condición que le da sentido.
          if (f.requiredIf && String(values[f.requiredIf.key] ?? "") !== f.requiredIf.value) return null;
          return (
            <FieldRow
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => setField(f.key, v)}
              inputCls={inputCls}
              obligatorio={esObligatorio(f, values)}
            />
          );
        })}
      </div>

      <div className="border-t border-line pt-6">
        <label className="block text-xs text-ink-muted mb-1.5">Tu nombre completo (para firmar)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" className={`${inputCls} mb-4`} />

        <label className="block text-xs text-ink-muted mb-1.5">Tu firma</label>
        <div className="relative rounded-xl overflow-hidden border border-line mb-2">
          <canvas
            ref={canvasRef}
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
            className="w-full h-40 bg-surface touch-none block"
          />
        </div>
        <button type="button" onClick={clearSig} className="text-xs text-ink-muted hover:text-ink transition-colors mb-4">
          Borrar firma
        </button>

        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand" />
          <span className="text-sm text-ink-muted">He leído y acepto {item.kind === "anexo_salud" ? "el anexo de salud" : "el contrato"}, y firmo de forma electrónica.</span>
        </label>

        {status === "error" && <p role="alert" className="text-sm text-danger mb-3">{msg}</p>}

        <button type="button" onClick={submit} disabled={status === "loading"} className="btn-brand text-base px-8 py-4 w-full disabled:opacity-60 disabled:cursor-not-allowed">
          {status === "loading" ? "Firmando…" : "Firmar y enviar"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field, value, onChange, inputCls, obligatorio,
}: {
  field: ContractField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  inputCls: string;
  obligatorio?: boolean;
}) {
  const marcaObligatorio = obligatorio ?? field.required;

  // Elección del inicio del servicio (Anexo II-A). Nada preseleccionado: el
  // consentimiento tiene que ser un clic de la clienta, no un valor de fábrica.
  if (field.type === "radio") {
    return (
      <fieldset className="rounded-xl border border-brand/30 bg-brand/[0.04] p-5">
        <legend className="px-2 text-sm font-bold text-ink">
          {field.label}{marcaObligatorio && <span className="text-brand"> *</span>}
        </legend>
        {field.hint && <p className="text-xs text-ink-muted mb-4">{field.hint}</p>}
        <div className="flex flex-col gap-3">
          {(field.options ?? []).map((o) => {
            const on = value === o.value;
            return (
              <label
                key={o.value}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                  on ? "border-brand bg-brand/10" : "border-line bg-page hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  name={field.key}
                  value={o.value}
                  checked={on}
                  onChange={() => onChange(o.value)}
                  className="mt-1 w-4 h-4 accent-brand shrink-0"
                />
                <span className="min-w-0">
                  <span className={`block font-bold ${o.destacar ? "text-base text-ink" : "text-sm text-ink"}`}>
                    {o.label}
                  </span>
                  {o.detalle && <span className="block text-xs text-ink-muted mt-1.5 leading-relaxed">{o.detalle}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand shrink-0"
        />
        <span className="text-sm text-ink-muted">{field.label}{marcaObligatorio && <span className="text-brand"> *</span>}</span>
      </label>
    );
  }
  if (field.type === "yesno") {
    return (
      <div>
        <p className="text-sm text-ink-muted mb-2">{field.label}{marcaObligatorio && <span className="text-brand"> *</span>}</p>
        <div className="flex gap-2">
          {(["si", "no"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
                value === opt
                  ? "bg-brand border-brand text-white"
                  : "border-line text-ink-muted hover:border-brand/40"
              }`}
            >
              {opt === "si" ? "SÍ" : "NO"}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-xs text-ink-muted mb-1.5">{field.label}</label>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y`}
        />
      </div>
    );
  }
  const type = field.type === "date" ? "date" : field.type === "tel" ? "tel" : "text";
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1.5">
        {field.label}{marcaObligatorio && <span className="text-brand"> *</span>}
      </label>
      <input
        type={type}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.hint ?? ""}
        className={inputCls}
      />
    </div>
  );
}
