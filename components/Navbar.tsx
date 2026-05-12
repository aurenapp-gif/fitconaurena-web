"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/que-es", label: "Qué es" },
  { href: "/metodologia", label: "Método" },
  { href: "/testimonios", label: "Testimonios" },
  { href: "/tarifas", label: "Precios" },
  { href: "/blog", label: "Blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="container-wide">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <Image src="/logo.svg" alt="Fit con Aurena logo" width={36} height={36} />
            <span
              className={`font-bold text-base tracking-tight transition-colors duration-300 ${
                scrolled || menuOpen ? "text-ink" : "text-white"
              }`}
            >
              Fit con <span style={{ color: "#F472B6" }}>Aurena</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  scrolled ? "text-ink-soft hover:bg-gray-50 hover:text-pink-dark" : "text-white/90 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/contacto"
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled ? "text-ink-muted hover:text-ink" : "text-white/70 hover:text-white"
              }`}
            >
              Contacto
            </Link>
            <Link href="/tarifas" className="btn-primary text-sm px-5 py-2.5">
              Empieza ahora
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled || menuOpen ? "text-ink" : "text-white"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-sm font-medium text-ink-soft rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/contacto"
                className="px-4 py-3 text-sm font-medium text-ink-muted rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Contacto
              </Link>
              <div className="px-4 pt-2">
                <Link href="/tarifas" className="btn-primary w-full text-sm" onClick={() => setMenuOpen(false)}>
                  Empieza ahora
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
