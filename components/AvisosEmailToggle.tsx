"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Si los avisos de actividad de las clientas llegan también por correo.
 *
 * Apagado de serie: el día de revisión son catorce correos iguales en dos
 * horas y un buzón así se deja de leer entero. Las notificaciones al móvil
 * siguen llegando, que es donde se miran.
 */
export default function AvisosEmailToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function cambiar(valor: boolean) {
    if (estado === "guardando") return;
    const antes = on;
    setOn(valor); setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/admin/ajustes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisos_email: valor }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setOn(antes); setEstado("error"); setMsg(d.error ?? "No se pudo guardar."); return; }
      setEstado("idle");
      setMsg(valor ? "Te llegarán también por correo." : "Solo al móvil. El correo se queda tranquilo.");
      router.refresh();
    } catch { setOn(antes); setEstado("error"); setMsg("Error de conexión."); }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink">Avisos de actividad por correo</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Avisos de actividad por correo"
          disabled={estado === "guardando"}
          onClick={() => cambiar(!on)}
          className={`relative w-[52px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-60 ${on ? "bg-brand" : "bg-line-strong"}`}
        >
          <span className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-all ${on ? "left-[23px]" : "left-[2px]"}`} />
        </button>
      </div>
      <p className="text-xs text-ink-subtle mt-1.5">
        Revisiones subidas, contratos firmados, vídeos de técnica y dudas nuevas. Apagado, siguen llegándote
        al móvil como notificación. El código de acceso y las solicitudes de clientas nuevas van por correo siempre.
      </p>
      {msg && <p className={`text-xs mt-1.5 ${estado === "error" ? "text-warn" : "text-brand"}`}>{msg}</p>}
    </div>
  );
}
