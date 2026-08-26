"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Se sube al cambiar el flujo de subida. Sale en pantalla, en pequeño, para
// poder saber de un vistazo qué versión está ejecutando el navegador de la
// coach en lugar de deducirlo por el texto de un aviso.
const VERSION = 4;

const MB = 1024 * 1024;
const MAX_MB = 25;
// Tope de las funciones de Vercel. Por debajo de esto el archivo puede viajar
// dentro de la petición; por encima, no hay más remedio que ir directo.
const MAX_SERVIDOR_MB = 4;
// Mismos tipos que acepta el servidor (lib/upload.ts, regla "plan").
const TIPOS_OK = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Subida del plan de una clienta. Dos vías, y se elige por tamaño:
 *
 *  · Hasta 4 MB → POR EL SERVIDOR. Es la vía que lleva funcionando desde
 *    siempre y la que subió los planes que hay hoy en la app. Se intenta
 *    PRIMERO precisamente por eso: ante un fallo que no se reproduce fuera del
 *    navegador de la coach, manda lo que está demostrado que funciona.
 *  · Más de 4 MB → DIRECTA a Storage. No cabe por el servidor (la petición se
 *    corta antes de llegar y el navegador solo ve un error de red genérico, que
 *    fue el famoso «Error de conexión»).
 *
 * Si la vía elegida falla, se prueba la otra. Y si fallan las dos, el error se
 * registra en el servidor: el problema solo pasa en su navegador y sin ese
 * registro no hay forma de saber qué falla.
 */
export default function PlanUpload({ member }: { member: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("nutricion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "subiendo" | "error">("idle");
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

  /** Deja constancia del fallo para poder diagnosticarlo. Nunca estorba. */
  function registrar(paso: string, mensaje: string, via: string, f: File) {
    fetch("/api/miembros/clientas/plan/incidencia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paso, mensaje: mensaje.slice(0, 500), via, bytes: f.size, mime: f.type }),
      keepalive: true,
    }).catch(() => {});
  }

  function hecho() {
    setTitle(""); setNote(""); setFile(null); setStatus("idle"); setMsg("");
    formRef.current?.reset();
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "subiendo") return;
    if (!file) { setStatus("error"); setMsg("Adjunta el archivo."); return; }
    if (file.size > MAX_MB * MB) return; // ya avisado al elegirlo

    const f = file;
    setStatus("subiendo"); setMsg("");
    const fallos: string[] = [];

    // El archivo se lee entero ANTES de empezar. Enviándolo tal cual, el
    // navegador lo lee mientras sube, y si no puede (está en iCloud sin
    // descargar, se movió después de elegirlo…) la petición revienta a mitad
    // con un error de red que parece un problema de conexión.
    let contenido: Blob;
    try {
      const bytes = await f.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("archivo vacío");
      contenido = new Blob([bytes], { type: f.type || "application/octet-stream" });
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      registrar("leer", detalle, "n/a", f);
      setStatus("error");
      setMsg(
        "No se ha podido leer el archivo. Suele pasar cuando está en iCloud o Drive y no está " +
        "descargado del todo, o si se movió después de elegirlo. Ábrelo una vez, o cópialo al " +
        "escritorio, y vuelve a seleccionarlo."
      );
      return;
    }

    /** Vía del servidor: el archivo viaja dentro de la petición. */
    async function porServidor(): Promise<boolean> {
      if (contenido.size > MAX_SERVIDOR_MB * MB) return false;
      try {
        const fd = new FormData();
        fd.append("member", member); fd.append("type", type);
        fd.append("title", title); fd.append("note", note);
        fd.append("file", contenido, f.name);
        const res = await fetch("/api/miembros/clientas/plan", { method: "POST", body: fd });
        if (res.ok) return true;
        const d = await res.json().catch(() => ({}));
        fallos.push(`servidor ${res.status}: ${d.error ?? ""}`.trim());
        registrar("servidor", `${res.status} ${d.error ?? ""}`, "servidor", f);
      } catch (e) {
        const detalle = e instanceof Error ? e.message : String(e);
        fallos.push(`servidor: ${detalle}`);
        registrar("servidor", detalle, "servidor", f);
      }
      return false;
    }

    /** Vía directa: permiso, subida a Storage y registro. Con reintentos. */
    async function porDirecta(): Promise<boolean> {
      try {
        const permiso = await fetch("/api/miembros/clientas/plan/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name, type }),
        });
        const datos = await permiso.json().catch(() => ({}));
        if (!permiso.ok) {
          fallos.push(`permiso ${permiso.status}: ${datos.error ?? ""}`.trim());
          registrar("permiso", `${permiso.status} ${datos.error ?? ""}`, "directa", f);
          return false;
        }

        let subida: Response | null = null;
        let ultimo = "";
        for (let intento = 1; intento <= 3; intento++) {
          try {
            subida = await fetch(datos.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": f.type || "application/octet-stream" },
              body: contenido,
            });
            break;
          } catch (e) {
            ultimo = e instanceof Error ? e.message : String(e);
            if (intento < 3) await new Promise((r) => setTimeout(r, intento * 1200));
          }
        }
        if (!subida) {
          fallos.push(`almacenamiento (3 intentos): ${ultimo}`);
          registrar("almacenamiento", ultimo, "directa", f);
          return false;
        }
        if (!subida.ok) {
          const detalle = await subida.text().catch(() => "");
          fallos.push(`almacenamiento ${subida.status}: ${detalle.slice(0, 80)}`);
          registrar("almacenamiento", `${subida.status} ${detalle.slice(0, 200)}`, "directa", f);
          return false;
        }

        const res = await fetch("/api/miembros/clientas/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member, type, title, note, path: datos.path, pathToken: datos.pathToken }),
        });
        if (res.ok) return true;
        const d = await res.json().catch(() => ({}));
        fallos.push(`registro ${res.status}: ${d.error ?? ""}`.trim());
        registrar("registro", `${res.status} ${d.error ?? ""}`, "directa", f);
      } catch (e) {
        const detalle = e instanceof Error ? e.message : String(e);
        fallos.push(`directa: ${detalle}`);
        registrar("directa", detalle, "directa", f);
      }
      return false;
    }

    // Por tamaño: lo pequeño por la vía probada, lo grande por la única posible.
    // Si la primera no sale, se intenta la otra antes de darse por vencido.
    const cabeEnServidor = contenido.size <= MAX_SERVIDOR_MB * MB;
    const orden = cabeEnServidor ? [porServidor, porDirecta] : [porDirecta, porServidor];
    for (const via of orden) {
      if (await via()) { hecho(); return; }
    }

    setStatus("error");
    setMsg(
      `No se ha podido subir (${(contenido.size / MB).toFixed(1)} MB). ` +
      `Queda registrado para revisarlo. Detalle: ${fallos.join(" · ").slice(0, 220)}`
    );
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

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
      <button type="submit" disabled={status === "subiendo"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "subiendo" ? "Subiendo…" : "Subir plan"}
      </button>
      <p className="text-[10px] text-[#3A3A3A]">subida v{VERSION}</p>
    </form>
  );
}
