"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tpl = { id: string; title: string };

/**
 * Alta de una clienta nueva. La coach elige aquí mismo qué contrato tendrá que
 * firmar: al entrar por primera vez, la clienta pasa por la bienvenida (nombre,
 * foto y condiciones) y acto seguido por la firma del contrato y del anexo de
 * salud, sin poder usar el resto de la app hasta completarlo.
 */
export default function AddClient({ contracts, hasAnexo }: { contracts: Tpl[]; hasAnexo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  // Dirección a la que se acaba de enviar el acceso. Se muestra tal cual para
  // que una errata al teclear se vea: es la causa más habitual de "no le ha
  // llegado el correo", y desde el formulario en blanco no hay forma de notarla.
  const [enviadoA, setEnviadoA] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/alta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, templateId: templateId || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(d.error ?? "No se pudo dar de alta.");
        return;
      }
      setStatus("ok");
      setMsg(d.warning ?? (templateId
        ? "Alta hecha, contrato asignado y correo de acceso enviado ✓"
        : "Alta hecha y correo de acceso enviado ✓"));
      setEnviadoA(d.emailEnviado ? (d.email ?? email) : "");
      setEmail("");
      setName("");
      setTemplateId("");
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Error de conexión.");
    }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#1CA0E3]";

  return (
    <form onSubmit={submit} className="card-dark p-5 !transform-none border-[#1CA0E3]/30 mb-6">
      <h3 className="font-bold text-white mb-3">Añadir clienta</h3>
      <div className="flex gap-3 flex-wrap">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email de la clienta" className={`${cls} flex-1 min-w-[200px]`} />
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="nombre (opcional)" className={cls} />
      </div>

      <div className="flex gap-3 flex-wrap mt-3">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          aria-label="Contrato que tendrá que firmar"
          className={`${cls} flex-1 min-w-[220px]`}
        >
          <option value="">— Contrato que firmará (opcional) —</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
          {status === "loading" ? "Dando de alta…" : "Dar de alta + enviar acceso"}
        </button>
      </div>

      {msg && <p className={`text-sm mt-3 ${status === "error" ? "text-[#FF6B6B]" : "text-[#1CA0E3]"}`}>{msg}</p>}
      {enviadoA && (
        <div className="mt-2 rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3">
          <p className="text-xs text-[#A0A0A0]">
            Enviado a <strong className="text-white break-all">{enviadoA}</strong>
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            Comprueba que la dirección es exactamente la suya, letra por letra. Si sobra o falta una
            letra el correo no llega a ningún sitio y no hay forma de saberlo. Dile también que mire
            en spam o correo no deseado la primera vez.
          </p>
        </div>
      )}
      <p className="text-xs text-[#666666] mt-2">
        Recibe un email de bienvenida con su enlace de acceso. Si eliges contrato, al entrar por primera vez tendrá que poner su nombre y foto, aceptar las condiciones y firmar el contrato
        {hasAnexo ? " junto con el anexo de salud" : ""} antes de poder usar la app.
      </p>
      {contracts.length === 0 && (
        <p className="text-xs text-[#FFB800] mt-1">No hay plantillas de contrato subidas todavía. Súbelas desde el Panel de la coach.</p>
      )}
    </form>
  );
}
