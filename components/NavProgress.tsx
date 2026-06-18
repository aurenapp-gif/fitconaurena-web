"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* Barra de progreso superior al navegar. Puramente visual: no intercepta ni
 * bloquea la navegación (no llama preventDefault), así que no puede romperla.
 * Arranca al hacer clic en un enlace interno y se completa al cambiar de ruta. */
export default function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const grow = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function start() {
      if (grow.current) clearInterval(grow.current);
      if (hide.current) clearTimeout(hide.current);
      setVisible(true);
      setWidth(8);
      grow.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.15 : w)), 200);
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const target = a.getAttribute("target");
      if (!href || href.startsWith("#") || target === "_blank" || a.hasAttribute("download")) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
      } catch {
        return;
      }
      start();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Al cambiar la ruta: completar y ocultar.
  useEffect(() => {
    if (grow.current) clearInterval(grow.current);
    setWidth((w) => (w > 0 ? 100 : 0));
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [pathname]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 200,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "#1CA0E3",
          boxShadow: "0 0 8px rgba(28,160,227,0.7)",
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}
