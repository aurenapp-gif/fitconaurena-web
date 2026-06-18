"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  hasTemplate: boolean;
  templateUrl?: string;
  signed: boolean;
  signedAt?: string;
  signedPdfUrl?: string;
  defaultName: string;
};

/** Firma del contrato por la clienta: ver el PDF, dibujar la firma y enviar. */
export default function ContractSign({ hasTemplate, templateUrl, signed, signedAt, signedPdfUrl, defaultName }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const [name, setName] = useState(defaultName ?? "");
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  // Ajusta la resolución real del lienzo a su tamaño en pantalla. CLAVE: la
  // pestaña "Contrato" está oculta al montar (display:none), así que al inicio
  // mide 0×0 y la firma no se capturaría. Por eso lo medimos cuando se hace
  // visible (ResizeObserver) y también justo antes de empezar a dibujar.
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
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0A0A0A";
    }
    hasDrawn.current = false;
  }

  useEffect(() => {
    if (signed) return;
    const c = canvasRef.current;
    if (!c) return;
    sizeCanvas();
    // Remide cuando la pestaña pasa de oculta a visible (o cambia el ancho).
    const ro = new ResizeObserver(() => sizeCanvas());
    ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signed, hasTemplate]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    sizeCanvas(); // garantiza que el lienzo tiene tamaño real antes de dibujar
    drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasDrawn.current = false;
  }

  async function submit() {
    if (status === "loading") return;
    if (name.trim().length < 3) { setStatus("error"); setMsg("Escribe tu nombre completo."); return; }
    if (!hasDrawn.current) { setStatus("error"); setMsg("Dibuja tu firma en el recuadro."); return; }
    if (!accepted) { setStatus("error"); setMsg("Marca la casilla para aceptar el contrato."); return; }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch("/api/miembros/contrato/firmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: name.trim(), signature: dataUrl }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo firmar."); return; }
      router.refresh();
    } catch { setStatus("error"); setMsg("Error de conexión. Inténtalo de nuevo."); }
  }

  // Ya firmado.
  if (signed) {
    return (
      <div className="card-dark p-6 !transform-none">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CA0E3] shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <div>
            <h2 className="font-bold text-white">Contrato firmado</h2>
            {signedAt && <p className="text-xs text-[#A0A0A0]">Firmado el {new Date(signedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>}
          </div>
        </div>
        <p className="text-sm text-[#A0A0A0] mb-4">Tu contrato ha quedado firmado correctamente. Puedes descargar tu copia.</p>
        {signedPdfUrl && (
          <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-6 py-3 inline-flex">
            Descargar contrato firmado
          </a>
        )}
      </div>
    );
  }

  // Sin plantilla disponible.
  if (!hasTemplate) {
    return (
      <div className="card-dark p-6 !transform-none">
        <h2 className="font-bold text-white mb-2">Contrato</h2>
        <p className="text-sm text-[#666666]">Tu coach aún no ha subido el contrato. Cuando esté disponible, podrás firmarlo aquí.</p>
      </div>
    );
  }

  // Plantilla disponible, pendiente de firma.
  return (
    <div className="card-dark p-6 !transform-none">
      <h2 className="font-bold text-white mb-1">Firma tu contrato</h2>
      <p className="text-sm text-[#A0A0A0] mb-4">Lee el contrato y fírmalo dibujando tu firma en el recuadro.</p>

      {templateUrl && (
        <a href={templateUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm px-5 py-2.5 inline-flex mb-5">
          Ver contrato
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
        </a>
      )}

      <label className="block text-xs text-[#A0A0A0] mb-1.5">Tu nombre completo</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre y apellidos"
        className="w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3] mb-4"
      />

      <label className="block text-xs text-[#A0A0A0] mb-1.5">Tu firma</label>
      <div className="relative rounded-xl overflow-hidden border border-[#252525] mb-2">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full h-40 bg-white touch-none block"
        />
      </div>
      <button type="button" onClick={clear} className="text-xs text-[#A0A0A0] hover:text-white transition-colors mb-4">
        Borrar firma
      </button>

      <label className="flex items-start gap-3 mb-4 cursor-pointer">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1CA0E3]" />
        <span className="text-sm text-[#A0A0A0]">He leído y acepto el contrato, y firmo de forma electrónica.</span>
      </label>

      {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B] mb-3">{msg}</p>}

      <button type="button" onClick={submit} disabled={status === "loading"} className="btn-brand text-base px-8 py-4 w-full disabled:opacity-60 disabled:cursor-not-allowed">
        {status === "loading" ? "Firmando…" : "Firmar y enviar"}
      </button>
    </div>
  );
}
