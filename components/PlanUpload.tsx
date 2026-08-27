"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Se sube al cambiar el flujo de subida. Sale en pantalla, en pequeño, para
// poder saber de un vistazo qué versión está ejecutando el navegador de la
// coach en lugar de deducirlo por el texto de un aviso.
const VERSION = 6;

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
/**
 * Tipos que se ofrecen en el buscador de archivos.
 *
 * Van los tipos MIME Y las extensiones: Safari no entiende las extensiones
 * sueltas («.pdf»), así que con solo esas no reconocía ningún plan.
 */
const ACCEPT = [
  ...TIPOS_OK,
  "image/*",
  ".pdf", ".doc", ".docx",
].join(",");

/** ¿Este arrastre trae un archivo (y no texto suelto de la propia página)? */
function traeArchivos(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const tipos = Array.from(dt.types ?? []);
  return tipos.includes("Files") || tipos.includes("text/uri-list");
}

type Entrada = { isFile: boolean; file: (ok: (f: File) => void, ko: () => void) => void };

/**
 * Todas las formas de conseguir el archivo que se acaba de soltar, en orden de
 * preferencia. Son vías DISTINTAS, no la misma repetida, y ahí está la gracia:
 * un plan arrastrado desde la ventana de descargas de Safari se coge bien por
 * una y da «The I/O read operation failed» por otra. Se prueban todas hasta
 * que una dé un archivo que se deje leer de verdad.
 *
 * Hay que pedirlas TODAS aquí, sin esperar a nada: en cuanto el manejador de
 * «soltar» termina, el navegador invalida lo que no se haya recogido.
 */
function viasDelArchivo(dt: DataTransfer): Array<() => Promise<File | null>> {
  const vias: Array<() => Promise<File | null>> = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file") continue;
    const bruto = item.webkitGetAsEntry?.();
    if (bruto?.isFile) {
      const entrada = bruto as unknown as Entrada;
      vias.push(() => new Promise<File | null>((ok) => entrada.file((f) => ok(f), () => ok(null))));
    }
    const directo = item.getAsFile();
    if (directo) vias.push(() => Promise.resolve(directo));
  }
  const primero = dt.files?.[0];
  if (primero) vias.push(() => Promise.resolve(primero));
  return vias;
}

/**
 * Lee el archivo entero a memoria, o devuelve null si no se deja.
 *
 * Se intenta por las dos vías porque no siempre funcionan las mismas: Safari
 * falla con `arrayBuffer()` en archivos que vienen de la ventana de descargas
 * y en cambio sí los lee con el lector de toda la vida.
 *
 * No lanza nunca: que no se pueda leer no es motivo para no intentar subirlo.
 */
async function leerEntero(f: File): Promise<Blob | null> {
  const envolver = (b: ArrayBuffer) =>
    b.byteLength > 0 ? new Blob([b], { type: f.type || "application/octet-stream" }) : null;

  try {
    const b = await f.arrayBuffer();
    const blob = envolver(b);
    if (blob) return blob;
  } catch { /* se prueba la otra vía */ }

  try {
    const b = await new Promise<ArrayBuffer>((ok, ko) => {
      const lector = new FileReader();
      lector.onload = () => ok(lector.result as ArrayBuffer);
      lector.onerror = () => ko(lector.error ?? new Error("lector"));
      lector.readAsArrayBuffer(f);
    });
    return envolver(b);
  } catch {
    return null;
  }
}

export default function PlanUpload({ member }: { member: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState("nutricion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "subiendo" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [encima, setEncima] = useState(false);
  const [preparando, setPreparando] = useState(false);
  // Aviso que NO impide subir (a diferencia de `msg`, que sí señala un error).
  const [nota, setNota] = useState("");
  // El arrastre entra y sale también al pasar por los textos de dentro del
  // recuadro. Contándolos, el recuadro no parpadea mientras se mueve el ratón.
  const dentro = useRef(0);
  // Lectura del archivo, lanzada nada más elegirlo (ver `elegir`).
  const lectura = useRef<Promise<Blob | null> | null>(null);

  // Si el archivo se suelta FUERA del recuadro, el navegador lo abre y se lleva
  // por delante lo que hubiera escrito en el formulario. Aquí se queda en nada.
  useEffect(() => {
    const tragar = (e: DragEvent) => { if (traeArchivos(e.dataTransfer)) e.preventDefault(); };
    window.addEventListener("dragover", tragar);
    window.addEventListener("drop", tragar);
    return () => {
      window.removeEventListener("dragover", tragar);
      window.removeEventListener("drop", tragar);
    };
  }, []);

  /** ¿Se puede admitir este archivo? Devuelve el motivo si no. */
  function motivoRechazo(f: File): string | null {
    if (f.size > MAX_MB * MB)
      return `Ese archivo pesa ${(f.size / MB).toFixed(1)} MB y el máximo son ${MAX_MB} MB. Comprímelo o divídelo.`;
    if (f.type && !TIPOS_OK.includes(f.type.toLowerCase()) && !f.type.startsWith("image/"))
      return "Solo se admiten PDF, Word o imagen.";
    return null;
  }

  function elegir(f: File | null, yaLeido?: Blob | null) {
    setFile(f);
    setStatus("idle");
    setMsg("");
    setNota("");
    lectura.current = null;
    if (!f) return;
    // Se avisa aquí mismo en vez de dejar que falle a mitad de la subida.
    const motivo = motivoRechazo(f);
    if (motivo) { setStatus("error"); setMsg(motivo); return; }
    // Se lee YA, no al darle a «Subir plan». Un archivo arrastrado desde la
    // ventana de descargas deja de poder leerse en cuanto pasa un rato, y para
    // entonces ya se ha escrito el título y el comentario. Leyéndolo ahora, lo
    // que se sube es una copia en memoria que nadie puede mover ni cerrar.
    lectura.current = yaLeido !== undefined ? Promise.resolve(yaLeido) : leerEntero(f);
  }

  async function soltar(e: React.DragEvent) {
    e.preventDefault();
    dentro.current = 0;
    setEncima(false);
    // Se recogen TODAS las vías antes de cualquier espera: después el navegador
    // las invalida (ver `viasDelArchivo`).
    const vias = viasDelArchivo(e.dataTransfer);
    if (!vias.length) {
      setStatus("error");
      setMsg("Eso que has soltado no es un archivo. Arrastra el plan desde las descargas o desde una carpeta.");
      return;
    }

    setPreparando(true);
    let primero: File | null = null;
    try {
      for (const traer of vias) {
        const f = await traer();
        if (!f) continue;
        const motivo = motivoRechazo(f);
        if (motivo) { elegir(f); return; }   // `elegir` ya pinta el motivo
        if (!primero) primero = f;
        const bytes = await leerEntero(f);
        if (bytes) { elegir(f, bytes); return; }
      }
    } finally {
      setPreparando(false);
    }

    // Ninguna vía se dejó leer. NO se bloquea: se queda el archivo elegido y al
    // darle a «Subir plan» se intentará mandarlo tal cual. Pero se dice ahora,
    // no después de escribir el título y el comentario.
    if (primero) {
      elegir(primero, null);
      registrar("leer", "ninguna vía del arrastre se dejó leer", "arrastre", primero);
      setNota(
        "Este archivo no se ha dejado leer al arrastrarlo. Puedes intentar subirlo igualmente, " +
        "pero si falla, pulsa el recuadro y búscalo en tus archivos: así siempre funciona."
      );
    } else {
      setStatus("error");
      setMsg("No se ha podido coger el archivo del arrastre. Pulsa el recuadro y búscalo en tus archivos.");
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
    setTitle(""); setNote(""); setFile(null); setStatus("idle"); setMsg(""); setNota("");
    lectura.current = null;
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

    // Se prefiere la copia en memoria que se hizo al elegir el archivo: sube
    // más rápido y no depende de que el original siga donde estaba. Pero si no
    // se ha podido leer, NO se planta: se manda el archivo tal cual y que lo
    // lea el navegador mientras sube, que es como funcionaba antes y como se
    // subieron los planes que hay hoy en la app.
    const leido = await (lectura.current ?? leerEntero(f));
    const contenido: Blob = leido ?? f;
    if (!leido) registrar("leer", "no se pudo leer; se envía el archivo tal cual", "n/a", f);

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
      (leido
        ? ""
        : "Además, el archivo no se ha dejado leer: si está en iCloud o Drive, ábrelo una vez " +
          "para que se descargue del todo, o cópialo al escritorio, y vuelve a arrastrarlo. ") +
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
      {/* El arrastre lo gestiona el recuadro, no el campo de archivo. Cuando lo
          gestionaba el campo, Safari comprobaba el `accept` antes de dejar
          soltar y rechazaba los planes: no reconocía «.pdf» ni «.docx». */}
      <label
        htmlFor="plan-archivo"
        onDragEnter={(e) => { e.preventDefault(); dentro.current += 1; setEncima(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={() => { dentro.current = Math.max(0, dentro.current - 1); if (dentro.current === 0) setEncima(false); }}
        onDrop={soltar}
        className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-7 text-center cursor-pointer transition-colors ${
          encima ? "border-[#1CA0E3] bg-[#1CA0E3]/10" : "border-[#3A3A3A] bg-[#0A0A0A] hover:border-[#1CA0E3]/60"
        }`}
      >
        <input
          id="plan-archivo"
          type="file"
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
          aria-label="Archivo del plan"
          accept={ACCEPT}
          className="sr-only"
        />
        <span className="text-sm font-bold text-white break-all">
          {preparando ? "Preparando el archivo…" : encima ? "Suelta el plan aquí" : file ? file.name : "Arrastra aquí el plan"}
        </span>
        <span className="text-xs text-[#666666]">
          {file && !encima && !preparando
            ? `${(file.size / MB).toFixed(1)} MB · pulsa para cambiarlo`
            : "o pulsa para buscarlo · PDF, Word o imagen"}
        </span>
      </label>
      {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}
      {status !== "error" && nota && <p className="text-sm text-[#E8B84B]">{nota}</p>}
      <button type="submit" disabled={status === "subiendo" || preparando} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "subiendo" ? "Subiendo…" : "Subir plan"}
      </button>
      <p className="text-[10px] text-[#3A3A3A]">subida v{VERSION}</p>
    </form>
  );
}
