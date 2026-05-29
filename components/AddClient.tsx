"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/miembros/clientas/alta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(d.error ?? "No se pudo dar de alta.");
        return;
      }
      setStatus("ok");
      setMsg(d.warning ?? "Alta hecha y correo de bienvenida enviado ✓");
      setEmail("");
      setName("");
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("Error de conexión.");
    }
  }

  const cls = "rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]";

  return (
    <form onSubmit={submit} className="card-dark p-5 !transform-none border-[#CAFF00]/30 mb-6">
      <h3 className="font-bold text-white mb-3">Añadir clienta</h3>
      <div className="flex gap-3 flex-wrap">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email de la clienta" className={`${cls} flex-1 min-w-[200px]`} />
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="nombre (opcional)" className={cls} />
        <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 disabled:opacity-60">
          {status === "loading" ? "Dando de alta…" : "Dar de alta + enviar acceso"}
        </button>
      </div>
      {msg && <p className={`text-sm mt-3 ${status === "error" ? "text-[#FF6B6B]" : "text-[#CAFF00]"}`}>{msg}</p>}
      <p className="text-xs text-[#666666] mt-2">Se le da de alta y recibe un email de bienvenida con su enlace de acceso.</p>
    </form>
  );
}
