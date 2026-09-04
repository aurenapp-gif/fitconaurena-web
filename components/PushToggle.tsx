"use client";

import { useEffect, useState } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied" | "working";

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Si no hay clave pública configurada, no mostramos nada (degradación segura).
    if (!VAPID) { setState("unsupported"); return; }

    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      // iOS solo admite push si la PWA está instalada (modo standalone).
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setState(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (Notification.permission === "denied") setState("denied");
        else setState(sub ? "on" : "off");
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("working"); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
    } catch (e) {
      console.error(e);
      setState("off");
      setMsg("No se pudo activar. Inténtalo de nuevo.");
    }
  }

  async function disable() {
    setState("working"); setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
    } catch (e) {
      console.error(e);
      setState("on");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="card-dark p-5 !transform-none mb-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h3 className="font-bold text-ink mb-0.5">Notificaciones</h3>
        <p className="text-sm text-ink-muted">
          {state === "on"
            ? "Activadas: te avisaremos de las respuestas de tu coach."
            : state === "denied"
            ? "Las has bloqueado en el navegador. Actívalas desde los ajustes del sitio."
            : state === "ios-install"
            ? "En iPhone: añade la app a tu pantalla de inicio para recibir avisos."
            : "Recibe un aviso cuando tu coach te responda."}
        </p>
        {msg && <p className="text-sm text-danger mt-1">{msg}</p>}
      </div>
      {state === "on" ? (
        <button onClick={disable} className="btn-outline text-sm px-5 py-2.5 shrink-0">Desactivar</button>
      ) : state === "off" || state === "working" ? (
        <button onClick={enable} disabled={state === "working"} className="btn-brand text-sm px-5 py-2.5 shrink-0 disabled:opacity-60">
          {state === "working" ? "…" : "Activar"}
        </button>
      ) : null}
    </div>
  );
}
