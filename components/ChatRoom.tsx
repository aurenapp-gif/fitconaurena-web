"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AudioRecorder, { audioExt } from "@/components/AudioRecorder";

type Msg = { id: string; sender: "member" | "coach"; body: string; created_at: string; audio_url?: string };

export default function ChatRoom({
  role,
  member,
  initialMessages,
}: {
  role: "member" | "coach";
  member?: string; // canal (obligatorio para coach)
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const qs = role === "coach" && member ? `?member=${encodeURIComponent(member)}` : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/miembros/chat${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.messages) {
        // Conservamos los mensajes optimistas (temp-) que el servidor aún no
        // ha devuelto, para que no parpadeen entre el envío y su confirmación.
        setMessages((prev) => {
          const serverBodies = new Set((data.messages as Msg[]).map((m) => m.body));
          const pendingTemps = prev.filter((m) => m.id.startsWith("temp-") && !serverBodies.has(m.body));
          return [...data.messages, ...pendingTemps];
        });
      }
    } catch {
      /* silencioso: reintentará en el siguiente ciclo */
    }
  }, [qs]);

  // Marcar leídos + refresco periódico.
  useEffect(() => {
    fetch("/api/miembros/chat/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member ? { member } : {}),
    }).catch(() => {});
    const id = setInterval(() => { if (!document.hidden) load(); }, 3000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [load, member]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");

    // UI optimista: mostramos el mensaje al instante con un id temporal.
    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = { id: tempId, sender: role, body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/miembros/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member ? { body, member } : { body }),
      });
      if (res.ok) {
        await load(); // sincroniza con el servidor (reemplaza el temporal)
      } else {
        // Falló: quitamos el optimista y devolvemos el texto al input.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(body);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(body);
    } finally {
      setSending(false);
    }
  }

  async function sendAudio(blob: Blob, mime: string) {
    if (sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = { id: tempId, sender: role, body: "🎤 Nota de voz", created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const fd = new FormData();
      fd.append("audio", new File([blob], `nota.${audioExt(mime)}`, { type: mime.split(";")[0] }));
      if (member) fd.append("member", member);
      const res = await fetch("/api/miembros/chat", { method: "POST", body: fd });
      if (res.ok) {
        await load();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  const isMine = (m: Msg) => m.sender === role;

  return (
    <div className="card-dark p-0 !transform-none overflow-hidden flex flex-col" style={{ height: "min(68vh, 560px)", minHeight: 380 }}>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[#666666] m-auto">Aún no hay mensajes. ¡Escribe el primero!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${isMine(m) ? "self-end" : "self-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  isMine(m) ? "bg-[#CAFF00] text-[#0A0A0A]" : "bg-[#1c1c1c] text-white"
                }`}
              >
                {m.audio_url ? (
                  <audio controls preload="none" src={m.audio_url} className="max-w-full h-10" />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
              </div>
              <p className={`text-[10px] text-[#666666] mt-1 ${isMine(m) ? "text-right" : ""}`}>
                {new Date(m.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-[#252525] p-3 flex-wrap">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="flex-1 min-w-[140px] rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00]"
        />
        <AudioRecorder onSend={sendAudio} disabled={sending} />
        <button type="submit" disabled={sending} className="btn-brand text-sm px-5 py-3 disabled:opacity-60">
          Enviar
        </button>
      </form>
    </div>
  );
}
