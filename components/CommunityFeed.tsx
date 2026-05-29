"use client";

import { useCallback, useEffect, useState } from "react";

type Post = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  canDelete: boolean;
  photoUrl?: string;
  avatarUrl?: string;
};

const TABS = [
  { key: "win", label: "Wins 🏆", title: "Comparte tu win", ph: "¿Qué has conseguido hoy? Comparte tu avance o victoria…" },
  { key: "receta", label: "Comidas 🍽️", title: "Comparte una receta", ph: "Cuéntanos tu receta o comida (opcional)…" },
] as const;

export default function CommunityFeed() {
  const [cat, setCat] = useState<"win" | "receta">("win");
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (c: string) => {
    try {
      const res = await fetch(`/api/miembros/comunidad?category=${c}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.posts) setPosts(data.posts);
    } catch { /* reintenta */ }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("fca_name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    load(cat);
    const id = setInterval(() => load(cat), 15000);
    return () => clearInterval(id);
  }, [cat, load]);

  const tab = TABS.find((t) => t.key === cat)!;

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (!body.trim() && !photo) { setStatus("error"); setMsg("Escribe algo o adjunta una foto."); return; }
    setStatus("loading"); setMsg("");
    try {
      if (name.trim()) localStorage.setItem("fca_name", name.trim());
      const fd = new FormData();
      fd.append("body", body);
      fd.append("name", name);
      fd.append("category", cat);
      if (photo) fd.append("photo", photo);
      const res = await fetch("/api/miembros/comunidad", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus("error"); setMsg(d.error ?? "No se pudo publicar."); return; }
      setBody(""); setPhoto(null); setStatus("idle");
      (e.target as HTMLFormElement).reset();
      await load(cat);
    } catch { setStatus("error"); setMsg("Error de conexión."); }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta publicación?")) return;
    await fetch(`/api/miembros/comunidad?id=${id}`, { method: "DELETE" }).catch(() => {});
    load(cat);
  }

  return (
    <div>
      {/* Pestañas */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setCat(t.key)}
            className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors ${cat === t.key ? "bg-[#CAFF00] text-[#0A0A0A]" : "border border-[#252525] text-[#A0A0A0] hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={publish} className="card-dark p-5 !transform-none border-[#CAFF00]/30 mb-6">
        <h3 className="font-bold text-white mb-3">{tab.title}</h3>
        <div className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre (cómo te verán)" aria-label="Tu nombre" maxLength={40}
            className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={tab.ph} aria-label="Publicación"
            className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] resize-none" />
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} aria-label="Foto"
            className="text-sm text-[#A0A0A0] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CAFF00] file:px-4 file:py-2 file:font-bold file:text-[#0A0A0A]" />
          {status === "error" && <p role="alert" className="text-sm text-[#FF6B6B]">{msg}</p>}
          <button type="submit" disabled={status === "loading"} className="btn-brand text-sm px-6 py-3 self-start disabled:opacity-60">
            {status === "loading" ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <p className="text-[#A0A0A0]">Todavía no hay publicaciones aquí. ¡Sé la primera!</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="card-dark p-5 !transform-none">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#252525] flex items-center justify-center shrink-0">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[#666666]">{p.author_name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-bold text-white truncate">{p.author_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-[#666666]">
                    {new Date(p.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {p.canDelete && (
                    <button onClick={() => remove(p.id)} className="text-[#666666] hover:text-[#FF6B6B] text-xs">Borrar</button>
                  )}
                </div>
              </div>
              {p.body && <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap mb-3">{p.body}</p>}
              {p.photoUrl && (
                <a href={p.photoUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photoUrl} alt="" className="max-h-72 rounded-lg border border-[#252525]" />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
