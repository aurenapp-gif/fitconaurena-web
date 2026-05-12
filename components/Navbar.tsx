"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#testimonios", label: "Testimonios" },
  { href: "/#tarifas", label: "Tarifas" },
  { href: "/#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#161616] bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="font-black text-lg tracking-tight text-white">
          fit<span className="text-[#CAFF00]">con</span>aurena
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[#A0A0A0] hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link href="/#tarifas" className="hidden md:inline-flex btn-brand text-sm px-5 py-2.5">
          Empezar ahora
        </Link>

        {/* Mobile burger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <span className={`block h-0.5 w-5 bg-white transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-5 bg-white transition-all ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-white transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#161616] bg-[#0A0A0A] px-5 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#A0A0A0] hover:text-white transition-colors py-1"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/#tarifas" onClick={() => setOpen(false)} className="btn-brand text-sm text-center mt-2">
            Empezar ahora
          </Link>
        </div>
      )}
    </header>
  );
}
