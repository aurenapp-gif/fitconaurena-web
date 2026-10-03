"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DelEquipo } from "@/lib/equipo";

/**
 * El equipo: quién entra a trabajar con las clientas y quién sale.
 *
 * Debajo de la lista se dice exactamente qué pueden y qué no. No es adorno:
 * dar de alta a alguien aquí es darle acceso a los datos de todas las
 * clientas, y eso hay que leerlo antes de pulsar, no después.
 */
export default function Equipo({ inicial }: { inicial: DelEquipo[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("Entrenador");
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function anadir() {
    if (estado === "guardando") return;
    setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre, puesto }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setEstado("idle"); setMsg(`${email} ya puede entrar con su correo.`);
      setEmail(""); setNombre("");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  async function quitar(x: DelEquipo) {
    if (!confirm(`¿Quitar a ${x.nombre || x.email} del equipo? Dejará de ver a las clientas.`)) return;
    setMsg("");
    try {
      const res = await fetch(`/api/miembros/equipo?email=${encodeURIComponent(x.email)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setEstado("error"); setMsg(d.error ?? "No se pudo quitar."); return; }
      setMsg("Quitado.");
      router.refresh();
    } catch { setEstado("error"); setMsg("Error de conexión."); }
  }

  const campo = "w-full rounded-xl border border-line bg-page px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre"
          aria-label="Nombre" className={campo} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
          type="email" inputMode="email" aria-label="Correo" className={campo} />
        <select value={puesto} onChange={(e) => setPuesto(e.target.value)} aria-label="Puesto" className={campo}>
          <option>Entrenador</option>
          <option>Entrenadora</option>
          <option>Nutricionista</option>
          <option>Coach</option>
        </select>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={anadir} disabled={!email.trim() || estado === "guardando"}
          className="btn-brand text-sm px-5 py-2.5 disabled:opacity-50">
          {estado === "guardando" ? "Guardando…" : "Añadir al equipo"}
        </button>
        {msg && <span className={`text-sm whitespace-pre-wrap ${estado === "error" ? "text-warn" : "text-brand"}`}>{msg}</span>}
      </div>

      {inicial.length > 0 && (
        <div className="bg-surface rounded-[14px] divide-y divide-line">
          {inicial.map((x) => (
            <div key={x.email} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold truncate">{x.nombre || x.email}</span>
                <span className="block text-[13px] text-ink-muted truncate">
                  {x.puesto ? `${x.puesto} · ` : ""}{x.email}{x.activo ? "" : " · de baja"}
                </span>
              </span>
              <button type="button" onClick={() => quitar(x)} aria-label={`Quitar a ${x.nombre || x.email}`}
                className="shrink-0 text-[13px] text-danger px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[14px] border border-line p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Qué puede hacer el equipo</p>
        <p className="text-[15px] text-ink leading-relaxed">
          Ver la ficha completa de cualquier clienta, sus planes, sus revisiones, sus fotos y su analizador.
          Subir planificaciones, responder revisiones, dudas y vídeos de técnica, poner agua, pasos y
          suplementación, y escribir el mapa de fases.
        </p>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mt-4 mb-2">Qué no</p>
        <p className="text-[15px] text-ink-muted leading-relaxed">
          Borrar una planificación subida, dar de alta o eliminar clientas, ver o asignar contratos,
          la contabilidad, los comunicados, las solicitudes y los ajustes de la plataforma.
          Todo eso es solo tuyo.
        </p>
      </div>
    </div>
  );
}
