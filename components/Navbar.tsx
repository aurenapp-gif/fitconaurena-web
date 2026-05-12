"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/sobre-mi", label: "Sobre mí" },
  { href: "/servicios", label: "Servicios" },
  { href: "/tarifas", label: "Tarifas" },
  { href: "/testimonios", label: "Testimonios" },
  { href: "/contacto", label: "Contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="Fit con Aurena" width={120} height={36} priority />
        </Link>

        {/* Hamburger button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col justify-center gap-1.5 w-8 h-8 cursor-pointer"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          <span className={`block h-px w-6 bg-black transition-all duration-300 origin-center ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`block h-px w-6 bg-black transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-px w-6 bg-black transition-all duration-300 origin-center ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* Dropdown menu */}
      <div className={`absolute top-full left-0 right-0 bg-white border-b border-gray-100 overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-gray-800 hover:text-black font-medium py-2.5 border-b border-gray-50 last:border-0 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
