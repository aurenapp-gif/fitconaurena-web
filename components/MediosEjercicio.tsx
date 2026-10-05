"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * La foto y el vídeo de un ejercicio, desde la propia ficha.
 *
 * Pensado para hacerse DESDE EL GIMNASIO con el móvil: se graba el ejercicio,
 * se sube a YouTube como «oculto», se pega el enlace aquí, y la foto se hace
 * con la cámara en el momento. Un minuto por ejercicio.
 */
export default function MediosEjercicio({
  id, imagen, video, puedeBorrar,
}: { id: string; imagen: string | null; video: string | null; puedeBorrar: boolean }) {
  const router = useRouter();
  const archivo = useRef<HTMLInputElement>(null);
  const [enlace, setEnlace] = useState(video ? `https://youtu.be/${video}` : "");
  const [cargando, setCargando] = useState<"foto" | "video" | "quitar" | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(false);

  function aviso(texto: string, mal = false) { setMsg(texto); setError(mal); }

  async function subirFoto(f: File) {
    setCargando("foto"); aviso("");
    try {
      const datos = new FormData();
      datos.append("id", id);
      datos.append("imagen", f);
      const res = await fetch("/api/miembros/ejercicios/media", { method: "POST", body: datos });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { aviso(d.error ?? "No se pudo subir.", true); return; }
      aviso("Foto guardada.");
      router.refresh();
    } catch { aviso("Error de conexión.", true); }
    finally { setCargando(null); if (archivo.current) archivo.current.value = ""; }
  }

  async function guardarVideo() {
    setCargando("video"); aviso("");
    try {
      const res = await fetch("/api/miembros/ejercicios/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, video: enlace }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { aviso(d.error ?? "No se pudo guardar.", true); return; }
      aviso(d.video ? "Vídeo guardado." : "Vídeo quitado.");
      router.refresh();
    } catch { aviso("Error de conexión.", true); }
    finally { setCargando(null); }
  }

  async function quitarTodo() {
    if (!confirm("¿Quitar la foto y el vídeo de este ejercicio?")) return;
    setCargando("quitar"); aviso("");
    try {
      const res = await fetch("/api/miembros/ejercicios/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { aviso(d.error ?? "No se pudo quitar.", true); return; }
      setEnlace("");
      aviso("Quitado.");
      router.refresh();
    } catch { aviso("Error de conexión.", true); }
    finally { setCargando(null); }
  }

  return (
    <div className="bg-surface rounded-xl p-4">
      <input
        ref={archivo}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFoto(f); }}
      />

      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" disabled={!!cargando}
          onClick={() => archivo.current?.click()}
          className="btn-outline text-xs px-4 py-2 disabled:opacity-50">
          {cargando === "foto" ? "Subiendo…" : imagen ? "Cambiar la foto" : "Subir una foto"}
        </button>
        {puedeBorrar && (imagen || video) && (
          <button type="button" disabled={!!cargando} onClick={quitarTodo}
            className="text-xs text-warn px-3 min-h-[36px] disabled:opacity-50">
            {cargando === "quitar" ? "…" : "Quitar"}
          </button>
        )}
      </div>

      <label className="block text-[13px] text-ink-muted mb-1.5" htmlFor={`video-${id}`}>
        Enlace del vídeo en YouTube
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={`video-${id}`}
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="https://youtu.be/…"
          className="flex-1 rounded-xl border border-line bg-page px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
        />
        <button type="button" disabled={!!cargando} onClick={guardarVideo}
          className="btn-brand text-xs px-5 py-2.5 disabled:opacity-50">
          {cargando === "video" ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <p className="text-[12px] text-ink-subtle mt-2 leading-relaxed">
        Súbelo a YouTube como «oculto» y pega aquí el enlace: así solo se ve desde la app y no sale en las búsquedas.
      </p>

      {msg && <p className={`text-xs mt-2 ${error ? "text-warn" : "text-brand"}`}>{msg}</p>}
    </div>
  );
}
