"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContractField, ContractKind } from "@/lib/contract";

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
        <p className="text-sm text-[#A0A0A0]">No tienes contratos pendientes de firma. Puedes volver al área privada.</p>
      </div>
    );
  }

  const current = items[active];

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
                  ? "bg-[#1CA0E3] border-[#1CA0E3] text-white"
                  : "border-[#252525] text-[#A0A0A0] hover:border-[#1CA0E3]/40"
              }`}
            >
              {it.kind === "anexo_salud" ? "Anexo de salud" : it.templateTitle}
            </button>
          ))}
        </div>
      )}
      <ContractCard
        key={current.assignmentId}
        item={current}
        defaultName={defaultName}
        defaultValues={defaultValues}
        onSigned={() => router.refresh()}
      />
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
  const hasDrawn = useRef(false);

  function sizeCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    const ratio = window.devicePixelRatio || 1;
    const targetW = Math.round(w * ratio);
    const targetH = Math.round(h * ratio);
    if (c.width === targetW && c.height === targetH) return;
    c.width = targetW; c.height = targetH;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "#0A0A0A";
    }
    hasDrawn.current = false;
  }
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    sizeCanvas();
    const ro = new ResizeObserver(() => sizeCanvas());
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault(); sizeCanvas(); drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = point(e); ctx.beginPath(); ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = point(e); ctx.lineTo(x, y); ctx.stroke();
    hasDrawn.current = true;
  }
  function end() { drawing.current = false; }
  function clearSig() {
    const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasDrawn.current = false;
  }

  function setField(key: string, val: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function submit() {
    if (status === "loading") return;
    if (name.trim().length < 3) { setStatus("error"); setMsg("Escribe tu nombre completo al firmar."); return; }
    if (!hasDrawn.current) { setStatus("error"); setMsg("Dibuja tu firma en el recuadro."); return; }
    if (!accepted) { setStatus("error"); setMsg("Marca la casilla para aceptar y firmar."); return; }
    // Validación básica en cliente (el backend re-valida).
    for (const f of item.fields) {
      if (f.key === "detalle_afirmativas") continue;
      if (!f.required) continue;
      const v = values[f.key];
      if (f.type === "checkbox") {
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

  const inputCls = "w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";
  const title = item.kind === "anexo_salud" ? "Anexo de salud" : item.templateTitle;
  const subtitle = item.kind === "anexo_salud"
    ? "Rellena tu declaración de salud y consentimiento antes de empezar."
    : "Lee el contrato, rellena tus datos y fírmalo para empezar.";

  return (
    <div className="card-dark p-6 !transform-none">
      <div className="mb-4">
        <h2 className="font-bold text-white text-lg">{title}</h2>
        <p className="text-sm text-[#A0A0A0]">{subtitle}</p>
      </div>

      {item.templateUrl && (
        <a href={item.templateUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm px-5 py-2.5 inline-flex mb-6">
          Ver documento completo
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
        </a>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {item.fields.map((f) => (
          <FieldRow key={f.key} field={f} value={values[f.key]} onChange={(v) => setField(f.key, v)} inputCls={inputCls} />
        ))}
      </div>

      <div className="border-t border-[#252525] pt-6">
        <label className="block text-xs text-[#A0A0A0] mb-1.5">Tu nombre completo (para firmar)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" className={`${inputCls} mb-4`} />

        <label className="block text-xs text-[#A0A0A0] mb-1.5">Tu firma</label>
        <div className="relative rounded-xl overflow-hidden border border-[#252525] mb-2">
          <canvas
            ref={canvasRef}
            onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
            className="w-full h-40 bg-white touch-none block"
          />
        </div>
        <button type="button" onClick={clearSig} className="text-xs text-[#A0A0A0] hover:text-white transition-colors mb-4">
          Borrar firma
        </button>

        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1CA0E3]" />
          <span className="text-sm text-[#A0A0A0]">He leído y acepto {item.kind === "anexo_salud" ? "el anexo de salud" : "el contrato"}, y firmo de forma electrónica.</span>
        </label>

        {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B] mb-3">{msg}</p>}

        <button type="button" onClick={submit} disabled={status === "loading"} className="btn-brand text-base px-8 py-4 w-full disabled:opacity-60 disabled:cursor-not-allowed">
          {status === "loading" ? "Firmando…" : "Firmar y enviar"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field, value, onChange, inputCls,
}: {
  field: ContractField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  inputCls: string;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#1CA0E3] shrink-0"
        />
        <span className="text-sm text-[#A0A0A0]">{field.label}{field.required && <span className="text-[#1CA0E3]"> *</span>}</span>
      </label>
    );
  }
  if (field.type === "yesno") {
    return (
      <div>
        <p className="text-sm text-[#A0A0A0] mb-2">{field.label}{field.required && <span className="text-[#1CA0E3]"> *</span>}</p>
        <div className="flex gap-2">
          {(["si", "no"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
                value === opt
                  ? "bg-[#1CA0E3] border-[#1CA0E3] text-white"
                  : "border-[#252525] text-[#A0A0A0] hover:border-[#1CA0E3]/40"
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
        <label className="block text-xs text-[#A0A0A0] mb-1.5">{field.label}</label>
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
      <label className="block text-xs text-[#A0A0A0] mb-1.5">
        {field.label}{field.required && <span className="text-[#1CA0E3]"> *</span>}
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
