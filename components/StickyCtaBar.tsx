"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StickyCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 py-3 px-4"
      style={{ background: "rgba(13,17,23,0.98)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(244,114,182,0.2)", boxShadow: "0 -4px 24px rgba(0,0,0,0.4)" }}
    >
      <div className="container-wide flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <p className="text-white font-semibold text-sm">+400 mujeres transformadas · ⭐⭐⭐⭐⭐ Upstore</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>🌙 Ciclo menstrual · 🎯 Servicio 1:1 · ❌ Sin permanencia</p>
        </div>
        <Link href="/tarifas" className="btn-primary text-sm flex-shrink-0 ml-auto" style={{ padding: "12px 24px" }}>
          Ver planes
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </div>
  );
}
