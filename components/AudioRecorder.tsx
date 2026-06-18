"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Grabadora de notas de voz (MediaRecorder). Reutilizable: el padre recibe el
 * audio listo en onSend(blob, mime). Elige el formato que soporte el navegador
 * (webm en Chrome/Android, mp4 en iPhone).
 */

export function audioExt(mime: string): string {
  const base = mime.split(";")[0];
  if (base.includes("mp4")) return "m4a";
  if (base.includes("mpeg")) return "mp3";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("wav")) return "wav";
  return "webm";
}

export default function AudioRecorder({
  onSend,
  disabled = false,
  maxSeconds = 180,
  sendLabel = "Enviar",
}: {
  onSend: (blob: Blob, mime: string) => void | Promise<void>;
  disabled?: boolean;
  maxSeconds?: number;
  sendLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cleanupTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => {
    return () => {
      cleanupTimer();
      recRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mimeRef.current = (rec.mimeType || mime || "audio/webm").split(";")[0];
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        blobRef.current = blob;
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        setState("preview");
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }

  function stop() {
    cleanupTimer();
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  }

  function discard() {
    cleanupTimer();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    blobRef.current = null;
    setState("idle");
    setSeconds(0);
  }

  async function send() {
    const blob = blobRef.current;
    if (!blob) return;
    await onSend(blob, mimeRef.current);
    discard();
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-[#FF6B6B] font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B6B] animate-pulse" /> {fmt(seconds)}
        </span>
        <button type="button" onClick={stop} className="btn-brand text-sm px-4 py-2.5">■ Parar</button>
      </div>
    );
  }

  if (state === "preview") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <audio controls src={previewUrl} className="h-10 max-w-[200px]" />
        <button type="button" onClick={send} disabled={disabled} className="btn-brand text-sm px-4 py-2.5 disabled:opacity-60">{sendLabel}</button>
        <button type="button" onClick={discard} className="text-sm text-[#FF6B6B] px-2" aria-label="Descartar">✕</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button" onClick={start} disabled={disabled}
        aria-label="Grabar nota de voz"
        className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-3.5 py-3 text-sm hover:border-[#1CA0E3] disabled:opacity-60"
      >
        🎤
      </button>
      {error && <span className="text-xs text-[#FF6B6B]">{error}</span>}
    </div>
  );
}
