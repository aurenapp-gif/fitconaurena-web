"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Se sube al cambiar el flujo de subida. Sale en pantalla, en pequeño, para
// poder saber de un vistazo qué versión está ejecutando el navegador de la
// coach en lugar de deducirlo por el texto de un aviso.
const VERSION = 3;

const MB = 1024 * 1024;
const MAX_MB = 25;
// Tope de las funciones de Vercel: por encima de esto, el archivo no puede
// viajar dentro de la petición y el camino de respaldo deja de servir.
const MAX_RESPALDO_MB = 4;
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

    /**
     * Red de seguridad: si la subida directa no sale, se reintenta mandando el
     * archivo dentro de la petición, como se hacía antes. Solo sirve por debajo
     * del tope del servidor, así que se limita a archivos pequeños; para los
     * grandes no hay alternativa y más vale decirlo que fingir que se reintenta.
     * Devuelve true si consiguió guardarlo.
     */
    async function respaldo(datos: Blob): Promise<boolean> {
      if (!file || datos.size > MAX_RESPALDO_MB * MB) return false;
      try {
        const fd = new FormData();
        fd.append("member", member); fd.append("type", type);
        fd.append("title", title); fd.append("note", note); fd.append("file", datos, file.name);
        const res = await fetch("/api/miembros/clientas/plan", { method: "POST", body: fd });
        if (!res.ok) return false;
        setTitle(""); setNote(""); setFile(null); setStatus("idle"); setMsg("");
        formRef.current?.reset();
        router.refresh();
        return true;
      } catch { return false; }
    }

    // PRIMERO se lee el archivo entero a memoria.
    //
    // Enviar el File directamente parece más eficiente, pero el navegador lo lee
    // MIENTRAS sube, y si por lo que sea no puede (el PDF está en iCloud o Drive
    // sin descargar del todo, se movió o se renombró después de elegirlo, el
    // disco externo se desconectó…) la petición revienta a media subida con un
    // error de red genérico. Eso es indistinguible de un problema de conexión y
    // manda a mirar el router cuando el problema es el archivo.
    //
    // Leyéndolo antes, ese caso se detecta al instante y se explica.
    let bytes: ArrayBuffer;
    setStatus("subiendo"); setMsg("");
    try {
      bytes = await file.arrayBuffer();
    } catch {
      setStatus("error");
      setMsg(
        "No se ha podido leer el archivo. Suele pasar cuando está en iCloud o Drive y no está " +
        "descargado del todo, o si se movió después de elegirlo. Ábrelo una vez, o cópialo al " +
        "escritorio, y vuelve a seleccionarlo."
      );
      return;
    }
    if (bytes.byteLength === 0) {
      setStatus("error");
      setMsg("El archivo llega vacío. Vuelve a seleccionarlo.");
      return;
    }
    const contenido = new Blob([bytes], { type: file.type || "application/octet-stream" });

    // El paso en curso viaja en el mensaje de error. Un «Error de conexión» a
    // secas obliga a adivinar; sabiendo en cuál de los tres pasos ha fallado y
    // con qué código, el problema se identifica a la primera.
    let paso = "1/3 preparar";
    try {
      // 1) Permiso de subida directa.
      const permiso = await fetch("/api/miembros/clientas/plan/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type }),
      });
      const datos = await permiso.json().catch(() => ({}));
      if (!permiso.ok) {
        if (await respaldo(contenido)) return;
        setStatus("error");
        setMsg(`${datos.error ?? "No se pudo preparar la subida"} (paso 1/3, código ${permiso.status})`);
        return;
      }

      // 2) El archivo va directo al almacenamiento, sin pasar por el servidor.
      //    Se reintenta un par de veces: un corte puntual de red a mitad de una
      //    subida de varios MB es de lo más normal desde el móvil o un wifi
      //    flojo, y no tiene sentido darlo por perdido al primer tropiezo.
      paso = "2/3 almacenamiento";
      let subida: Response | null = null;
      let ultimoFallo = "";
      for (let intento = 1; intento <= 3; intento++) {
        try {
          subida = await fetch(datos.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: contenido,
          });
          break;
        } catch (e) {
          ultimoFallo = e instanceof Error ? e.message : String(e);
          if (intento === 3) break;
          await new Promise((r) => setTimeout(r, intento * 1200));
        }
      }
      if (!subida) {
        if (await respaldo(contenido)) return;
        setStatus("error");
        setMsg(
          contenido.size > MAX_RESPALDO_MB * MB
            ? `Se cortó al enviar el archivo tras 3 intentos, y pesa ${(contenido.size / MB).toFixed(1)} MB: ` +
              `demasiado para la vía alternativa (máx ${MAX_RESPALDO_MB} MB). Comprime el PDF y vuelve a subirlo. ` +
              ultimoFallo.slice(0, 80)
            : `Se cortó al enviar el archivo tras 3 intentos. ${ultimoFallo.slice(0, 120)}`
        );
        return;
      }
      if (!subida.ok) {
        const detalle = await subida.text().catch(() => "");
        if (await respaldo(contenido)) return;
        setStatus("error");
        setMsg(`No se pudo guardar el archivo (paso 2/3, código ${subida.status}). ${detalle.slice(0, 120)}`);
        return;
      }

      // 3) Registrar el plan (ya sin el peso del archivo).
      paso = "3/3 registrar";
      setStatus("guardando");
      const res = await fetch("/api/miembros/clientas/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, type, title, note, path: datos.path, pathToken: datos.pathToken }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("error");
        setMsg(`${d.error ?? "No se pudo guardar el plan"} (paso 3/3, código ${res.status})`);
        return;
      }

      setTitle(""); setNote(""); setFile(null); setStatus("idle"); setMsg("");
      formRef.current?.reset();
      router.refresh();
    } catch (e) {
      if (await respaldo(contenido)) return;
      setStatus("error");
      const detalle = e instanceof Error ? e.message : String(e);
      setMsg(`Se cortó en el paso ${paso}. ${detalle.slice(0, 140)}`);
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
      {/* Marca de versión. Parece un detalle tonto, pero al depurar un fallo que
          solo ocurre en el navegador de la coach es la diferencia entre saber
          qué código está ejecutando y adivinarlo por el texto de un aviso. */}
      <p className="text-[10px] text-[#3A3A3A]">subida v{VERSION}</p>
      <button type="submit" disabled={ocupado} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "subiendo" ? "Subiendo el archivo…" : status === "guardando" ? "Guardando…" : "Subir plan"}
      </button>
    </form>
  );
}
