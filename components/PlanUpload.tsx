"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MB = 1024 * 1024;
const MAX_MB = 25;
// Mismos tipos que acepta el servidor (lib/upload.ts, regla "plan").
const TIPOS_OK = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Subida del plan de una clienta.
 *
 * El archivo va DIRECTO a Storage y solo después se registra en el servidor.
 * Antes viajaba dentro de la propia petición, y cualquier plan de más de 4,5 MB
 * chocaba con el tope de las funciones de Vercel: la conexión se cortaba antes
 * de llegar y en pantalla salía «Error de conexión», que hacía pensar en un
 * problema de internet cuando el internet estaba perfecto.
 */
export default function PlanUpload({ member }: { member: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("nutricion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "subiendo" | "guardando" | "error">("idle");
  const [msg, setMsg] = useState("");

  function elegir(f: File | null) {
    setFile(f);
    setStatus("idle");
    setMsg("");
    if (!f) return;
    // Se avisa aquí mismo en vez de dejar que falle a mitad de la subida.
    if (f.size > MAX_MB * MB) {
      setStatus("error");
      setMsg(`Ese archivo pesa ${(f.size / MB).toFixed(1)} MB y el máximo son ${MAX_MB} MB. Comprímelo o divídelo.`);
    } else if (f.type && !TIPOS_OK.includes(f.type.toLowerCase()) && !f.type.startsWith("image/")) {
      setStatus("error");
      setMsg("Solo se admiten PDF, Word o imagen.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "subiendo" || status === "guardando") return;
    if (!file) { setStatus("error"); setMsg("Adjunta el archivo."); return; }
    if (file.size > MAX_MB * MB) return; // ya avisado al elegirlo

    setStatus("subiendo"); setMsg("");
    try {
      // 1) Permiso de subida directa.
      const permiso = await fetch("/api/miembros/clientas/plan/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type }),
      });
      const datos = await permiso.json().catch(() => ({}));
      if (!permiso.ok) { setStatus("error"); setMsg(datos.error ?? "No se pudo preparar la subida."); return; }

      // 2) El archivo va directo al almacenamiento, sin pasar por el servidor.
      const subida = await fetch(datos.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!subida.ok) {
        setStatus("error");
        setMsg("Falló la subida del archivo. Revisa tu conexión y vuelve a intentarlo.");
        return;
      }

      // 3) Registrar el plan (ya sin el peso del archivo).
      setStatus("guardando");
      const res = await fetch("/api/miembros/clientas/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, type, title, note, path: datos.path, pathToken: datos.pathToken }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("error"); setMsg(d.error ?? "No se pudo guardar el plan.");
        return;
      }

      setTitle(""); setNote(""); setFile(null); setStatus("idle"); setMsg("");
      formRef.current?.reset();
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Se ha cortado la subida. Vuelve a intentarlo.");
    }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";
  const ocupado = status === "subiendo" || status === "guardando";

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        <select value={type} onChange={(e) => setType(e.target.value)} className={cls}>
          <option value="nutricion">Nutrición</option>
          <option value="entrenamiento">Entrenamiento</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" className={`${cls} flex-1`} />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Comentario para la clienta (opcional): indicaciones, cambios respecto al mes anterior…"
        aria-label="Comentario para la clienta"
        className={cls}
      />
      <input type="file" onChange={(e) => elegir(e.target.files?.[0] ?? null)} aria-label="Archivo del plan"
        accept=".pdf,.doc,.docx,image/*"
        className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1CA0E3] file:px-4 file:py-2 file:font-bold file:text-white" />
      {file && status !== "error" && (
        <p className="text-xs text-[#666666]">{file.name} · {(file.size / MB).toFixed(1)} MB</p>
      )}
      {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}
      <button type="submit" disabled={ocupado} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "subiendo" ? "Subiendo el archivo…" : status === "guardando" ? "Guardando…" : "Subir plan"}
      </button>
    </form>
  );
}
