"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Se sube al cambiar el flujo de subida. Sale en pantalla, en pequeño, para
// poder saber de un vistazo qué versión está ejecutando el navegador de la
// coach en lugar de deducirlo por el texto de un aviso.
const VERSION = 8;

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

/** ¿Este arrastre trae un archivo (y no texto suelto de la propia página)? */
function traeArchivos(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const tipos = Array.from(dt.types ?? []);
  return tipos.includes("Files") || tipos.includes("text/uri-list");
}

type Entrada = { isFile: boolean; file: (ok: (f: File) => void, ko: () => void) => void };

type Via = { nombre: string; traer: () => Promise<File | null> };

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
function viasDelArchivo(dt: DataTransfer): Via[] {
  const vias: Via[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file") continue;
    const bruto = item.webkitGetAsEntry?.();
    if (bruto?.isFile) {
      const entrada = bruto as unknown as Entrada;
      vias.push({ nombre: "entrada", traer: () => new Promise<File | null>((ok) => entrada.file((f) => ok(f), () => ok(null))) });
    }
    const directo = item.getAsFile();
    if (directo) vias.push({ nombre: "item", traer: () => Promise.resolve(directo) });
  }

  const primero = dt.files?.[0];
  if (primero) vias.push({ nombre: "files", traer: () => Promise.resolve(primero) });
  return vias;
}

/**
 * Lee el archivo entero a memoria, o devuelve null si no hay manera.
 *
 * Tres mecanismos distintos, no el mismo repetido, porque en Safari fallan por
 * separado. El tercero es el que más importa: leer el archivo por la pila de
 * red del navegador es EXACTAMENTE lo que hacía la subida antes de que se
 * añadiera esta lectura previa, y esa subida funcionaba.
 *
 * No lanza nunca: que no se pueda leer no es motivo para no intentar subirlo.
 */
async function leerEntero(f: File): Promise<{ blob: Blob; via: string } | null> {
  const tipo = f.type || "application/octet-stream";

  try {
    const b = await f.arrayBuffer();
    if (b.byteLength > 0) return { blob: new Blob([b], { type: tipo }), via: "arrayBuffer" };
  } catch { /* siguiente */ }

  try {
    const b = await new Promise<ArrayBuffer>((ok, ko) => {
      const lector = new FileReader();
      lector.onload = () => ok(lector.result as ArrayBuffer);
      lector.onerror = () => ko(lector.error ?? new Error("lector"));
      lector.readAsArrayBuffer(f);
    });
    if (b.byteLength > 0) return { blob: new Blob([b], { type: tipo }), via: "FileReader" };
  } catch { /* siguiente */ }

  // Por la pila de red: se le pone una dirección temporal al archivo y se pide
  // como si fuera una descarga. Lo lee el navegador por dentro, no la página.
  let url = "";
  try {
    url = URL.createObjectURL(f);
    const res = await fetch(url);
    const blob = await res.blob();
    if (blob.size > 0) return { blob: blob.type ? blob : new Blob([blob], { type: tipo }), via: "objectURL" };
  } catch { /* nada más que probar */ }
  finally { if (url) URL.revokeObjectURL(url); }

  return null;
}

/**
 * Subida del plan de una clienta. Dos vías para enviarlo, y se elige por tamaño:
 *
 *  · Hasta 4 MB → POR EL SERVIDOR. Es la vía que lleva funcionando desde
 *    siempre y la que subió los planes que hay hoy en la app.
 *  · Más de 4 MB → DIRECTA a Storage. No cabe por el servidor (la petición se
 *    corta antes de llegar y el navegador solo ve un error de red genérico, que
 *    fue el famoso «Error de conexión»).
 *
 * Si la elegida falla se prueba la otra, y si fallan las dos el error se
 * registra en el servidor: el problema solo se da en el navegador de la coach y
 * sin ese registro no hay forma de saber qué falla.
 */
export default function PlanUpload({ member }: { member: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState("nutricion");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "subiendo" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [encima, setEncima] = useState(false);
  const [preparando, setPreparando] = useState(false);
  // El arrastre entra y sale también al pasar por los textos de dentro del
  // recuadro. Contándolos, el recuadro no parpadea mientras se mueve el ratón.
  const dentro = useRef(0);
  // Lectura del archivo, lanzada nada más elegirlo (ver `elegir`).
  const lectura = useRef<Promise<Blob | null> | null>(null);

  // Si el archivo se suelta FUERA del recuadro, el navegador lo abre y se lleva
  // por delante lo que hubiera escrito en el formulario. Aquí se queda en nada.
  //
  // DENTRO del recuadro, en cambio, no se toca: el soltar sube hasta aquí desde
  // el campo de archivo, y anularlo ahora cancelaría la recogida del navegador
  // —que es justo lo que le da al archivo permiso de lectura—.
  useEffect(() => {
    const tragar = (e: DragEvent) => {
      const donde = e.target as Node | null;
      if (donde && zonaRef.current?.contains(donde)) return;
      if (traeArchivos(e.dataTransfer)) e.preventDefault();
    };
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
    lectura.current = null;
    if (!f) return;
    // Se avisa aquí mismo en vez de dejar que falle a mitad de la subida.
    const motivo = motivoRechazo(f);
    if (motivo) { setStatus("error"); setMsg(motivo); return; }
    // Se lee YA, no al darle a «Subir plan». Un archivo arrastrado desde la
    // ventana de descargas deja de poder leerse en cuanto pasa un rato, y para
    // entonces ya se ha escrito el título y el comentario. Leyéndolo ahora, lo
    // que se sube es una copia en memoria que nadie puede mover ni cerrar.
    lectura.current = yaLeido !== undefined
      ? Promise.resolve(yaLeido)
      : leerEntero(f).then((r) => r?.blob ?? null);
  }

  /**
   * Red de seguridad del arrastre.
   *
   * OJO: aquí NO se llama a preventDefault. Del soltar se encarga el campo de
   * archivo que hay debajo, y esta función solo mira, un instante después, si
   * el campo se ha quedado con algo. Si sí —lo normal—, no hace nada. Si no
   * —porque el navegador rechazó el arrastre—, entonces sí se intenta sacar el
   * archivo a mano, que es mejor que dejarla sin nada.
   */
  function soltar(e: React.DragEvent) {
    dentro.current = 0;
    setEncima(false);
    // Las vías hay que recogerlas AHORA, aunque quizá no se usen: en cuanto
    // termina el manejador, el navegador invalida lo que no se haya cogido.
    const vias = viasDelArchivo(e.dataTransfer);
    const antes = campoRef.current?.files?.[0] ?? null;
    if (!vias.length) return;
    window.setTimeout(() => {
      const ahora = campoRef.current?.files?.[0] ?? null;
      if (ahora && ahora !== antes) return;  // lo cogió el navegador: perfecto
      void aMano(vias);
    }, 700);
  }

  async function aMano(vias: Via[]) {
    setPreparando(true);
    let primero: File | null = null;
    const intentos: string[] = [];
    try {
      for (const via of vias) {
        const f = await via.traer();
        if (!f) { intentos.push(`${via.nombre}:vacía`); continue; }
        const motivo = motivoRechazo(f);
        if (motivo) { elegir(f); return; }   // `elegir` ya pinta el motivo
        if (!primero) primero = f;
        const leido = await leerEntero(f);
        if (leido) {
          elegir(f, leido.blob);
          // Solo interesa saberlo cuando hizo falta más de un intento.
          if (intentos.length) registrar("leer", `bien por ${via.nombre}/${leido.via} tras ${intentos.join(",")}`, "arrastre", f);
          return;
        }
        intentos.push(`${via.nombre}:ilegible`);
      }
    } finally {
      setPreparando(false);
    }

    // Si se llega aquí es que el navegador no recogió el archivo y a mano
    // tampoco hay forma de leerlo. Un archivo así tampoco se puede enviar: la
    // subida se queda en «Load failed» a mitad. Se dice ya, en vez de hacerle
    // escribir el título y el comentario para acabar en el mismo sitio.
    if (primero) elegir(primero, null);
    registrar("leer", `arrastre sin permiso de lectura (${intentos.join(",")})`, "arrastre", primero ?? new File([], "?"));
    setStatus("error");
    setMsg("Tu navegador no ha dejado coger este archivo del arrastre. Pulsa el recuadro y búscalo en tus archivos: por ahí entra siempre.");
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
    let leido = await (lectura.current ?? leerEntero(f).then((r) => r?.blob ?? null));
    // Segundo intento en el momento de subir. No es redundante: entre soltar el
    // archivo y pulsar el botón pasa un rato, y a veces lo que no se dejaba
    // leer al principio sí se deja ahora.
    if (!leido) leido = await leerEntero(f).then((r) => r?.blob ?? null);
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
        : "Este archivo no se deja leer al arrastrarlo. Pulsa el recuadro y búscalo en tus " +
          "archivos: por ahí siempre entra. ") +
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
      {/*
        EL SOLTAR LO ATIENDE EL CAMPO DE ARCHIVO, NO ESTE RECUADRO.

        El campo está estirado por encima de todo el recuadro, invisible. Así el
        archivo cae sobre él y es el navegador quien lo recoge, no esta página.
        La diferencia no es cosmética: cuando lo recoge el navegador, le da al
        archivo permiso de lectura; cuando lo interceptábamos nosotros, el
        archivo llegaba sin ese permiso y después no había forma de leerlo ni de
        enviarlo («The I/O read operation failed» primero y «Load failed» al
        intentar subirlo tal cual).

        Por eso aquí NO se llama a preventDefault en «arrastrar por encima» ni
        en «soltar»: hacerlo anularía justo lo que tiene que ocurrir.
      */}
      <div
        ref={zonaRef}
        onDragEnter={() => { dentro.current += 1; setEncima(true); }}
        onDragLeave={() => { dentro.current = Math.max(0, dentro.current - 1); if (dentro.current === 0) setEncima(false); }}
        onDrop={soltar}
        className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-7 text-center transition-colors ${
          encima ? "border-[#1CA0E3] bg-[#1CA0E3]/10" : "border-[#3A3A3A] bg-[#0A0A0A] hover:border-[#1CA0E3]/60"
        }`}
      >
        {/* Sin `accept`: es lo que hacía que Safari rechazara el arrastre de los
            planes. El tipo se comprueba igual aquí abajo y en el servidor. */}
        <input
          id="plan-archivo"
          ref={campoRef}
          type="file"
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
          aria-label="Archivo del plan"
          className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
        />
        <span className="text-sm font-bold text-white break-all pointer-events-none">
          {preparando ? "Preparando el archivo…" : encima ? "Suelta el plan aquí" : file ? file.name : "Arrastra aquí el plan"}
        </span>
        <span className="text-xs text-[#666666] pointer-events-none">
          {file && !encima && !preparando
            ? `${(file.size / MB).toFixed(1)} MB · pulsa para cambiarlo`
            : "o pulsa para buscarlo · PDF, Word o imagen"}
        </span>
      </div>
      {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}
      <button type="submit" disabled={status === "subiendo" || preparando} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
        {status === "subiendo" ? "Subiendo…" : "Subir plan"}
      </button>
      <p className="text-[10px] text-[#3A3A3A]">subida v{VERSION}</p>
    </form>
  );
}
