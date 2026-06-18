"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function MemberMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A0A0A0] hover:text-white transition-colors"
      >
        Miembros
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#252525] bg-[#0F0F0F] p-1.5 shadow-xl">
          <Link
            href="/miembros/acceso"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm text-white hover:bg-[#1CA0E3]/10 hover:text-[#1CA0E3] transition-colors"
          >
            Acceso para miembros
          </Link>
        </div>
      )}
    </div>
  );
}
