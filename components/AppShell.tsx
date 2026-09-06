"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Armazón de navegación del área de miembros.
 *
 * En escritorio, una barra lateral fija con todas las secciones. En móvil —que
 * es donde la mayoría abre la app— una barra de cinco pestañas abajo, al
 * alcance del pulgar, y una hoja «Más» con el resto.
 *
 * Los iconos siguen la convención del iPhone: glifo relleno en la pestaña
 * activa, de línea en las demás. Son dibujos propios en ese estilo.
 *
 * Es un componente cliente porque necesita la ruta actual para marcar la
 * sección activa. No sabe nada de la sesión: el `admin` se lo pasa la página,
 * que es quien la ha comprobado en el servidor.
 */

type Icono = "inicio" | "perfil" | "revisiones" | "avisos" | "mas" | "dudas" | "tecnica" | "herramientas" | "agenda" | "contratos" | "clientas" | "panel" | "leads" | "salir";
type Item = { href: string; label: string; icon: Icono; coach?: boolean };

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Versión de línea (inactiva) de cada icono, 24×24. */
const LINEA: Record<Icono, JSX.Element> = {
  inicio: <path d="M3.8 11 12 4.2 20.2 11V19a1.8 1.8 0 0 1-1.8 1.8h-4v-6h-4.8v6h-4A1.8 1.8 0 0 1 3.8 19z" />,
  perfil: <><circle cx="12" cy="7.8" r="3.6" /><path d="M4.3 20.5c.5-3.9 3.8-6.2 7.7-6.2s7.2 2.3 7.7 6.2" /></>,
  revisiones: <><rect x="3.8" y="5" width="16.4" height="16" rx="2.2" /><path d="M8 5V4a1.2 1.2 0 0 1 1.2-1.2h5.6A1.2 1.2 0 0 1 16 4v1" /><path d="m8.8 13.2 2.4 2.4 4.4-4.8" /></>,
  avisos: <><path d="M6.4 13.6V9.2a5.6 5.6 0 0 1 11.2 0v4.4l1.7 2.2H4.7z" /><path d="M10 19.3a2 2 0 0 0 4 0" /></>,
  mas: <><circle cx="12" cy="12" r="8.7" /><circle cx="7.8" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="16.2" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  dudas: <><circle cx="12" cy="12" r="8.7" /><path d="M9.6 9.2a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.7M12 16.8h.01" /></>,
  tecnica: <><rect x="3.5" y="6" width="12.5" height="12" rx="2.2" /><path d="M16 10l4.5-2.6v9.2L16 14z" /></>,
  herramientas: <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.7-6.7z" />,
  agenda: <><rect x="3.5" y="5" width="17" height="16" rx="2.4" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  contratos: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 13h6M9 17h4" /></>,
  clientas: <><circle cx="9" cy="8" r="3.4" /><circle cx="17" cy="9" r="2.4" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 20a5 5 0 0 1 6.5-4.8" /></>,
  panel: <><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.8" /><rect x="13" y="3.5" width="7.5" height="5" rx="1.8" /><rect x="13" y="10.5" width="7.5" height="10" rx="1.8" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.8" /></>,
  leads: <path d="M4 5h16l-6 8v6l-4-2v-4z" />,
  salir: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
};

/** Versión rellena (activa) de las cinco pestañas. Las demás usan la de línea. */
const RELLENO: Partial<Record<Icono, JSX.Element>> = {
  inicio: <path fill="currentColor" stroke="none" d="M11.2 3.3a1.3 1.3 0 0 1 1.6 0l7.7 6.2c.3.3.5.7.5 1.1V19a2 2 0 0 1-2 2h-4.5v-6a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v6H5a2 2 0 0 1-2-2v-8.4c0-.4.2-.8.5-1.1z" />,
  perfil: <g fill="currentColor" stroke="none"><circle cx="12" cy="7.8" r="4.3" /><path d="M3.5 20.2c.6-4.2 4.2-6.7 8.5-6.7s7.9 2.5 8.5 6.7c.1.6-.4 1.1-1 1.1h-15c-.6 0-1.1-.5-1-1.1z" /></g>,
  revisiones: <><path fill="currentColor" stroke="none" d="M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v.5H19a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h1.5V4A1.5 1.5 0 0 1 8 2.5z" /><path d="m8.6 13.2 2.4 2.4 4.6-4.9" stroke="rgb(var(--c-surface))" strokeWidth="1.9" /></>,
  avisos: <g fill="currentColor" stroke="none"><path d="M12 2.8a6.2 6.2 0 0 0-6.2 6.2v4.6l-1.6 2.1c-.5.7 0 1.6.8 1.6h14c.8 0 1.3-.9.8-1.6l-1.6-2.1V9A6.2 6.2 0 0 0 12 2.8z" /><path d="M9.6 19.4a2.4 2.4 0 0 0 4.8 0z" /></g>,
  mas: <g stroke="none"><circle cx="12" cy="12" r="9.5" fill="currentColor" /><circle cx="7.6" cy="12" r="1.4" fill="rgb(var(--c-surface))" /><circle cx="12" cy="12" r="1.4" fill="rgb(var(--c-surface))" /><circle cx="16.4" cy="12" r="1.4" fill="rgb(var(--c-surface))" /></g>,
};

function Icono({ nombre, on = false, tamano = 26 }: { nombre: Icono; on?: boolean; tamano?: number }) {
  const g = (on && RELLENO[nombre]) || LINEA[nombre];
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" {...S} aria-hidden="true">{g}</svg>
  );
}

// Las cinco de abajo, en el orden en que se usan. «Avisos» es Comunicados y
// «Revisiones» son los check-ins: es como se llaman en los avisos y como lo
// dicen ellas.
const PESTANAS: Item[] = [
  { href: "/miembros", label: "Inicio", icon: "inicio" },
  { href: "/miembros/perfil", label: "Perfil", icon: "perfil" },
  { href: "/miembros/checkins", label: "Revisiones", icon: "revisiones" },
  { href: "/miembros/comunicados", label: "Avisos", icon: "avisos" },
];

// Lo demás: en la barra lateral va todo seguido; en móvil, dentro de «Más».
const RESTO: Item[] = [
  { href: "/miembros/dudas", label: "Dudas", icon: "dudas" },
  { href: "/miembros/tecnica", label: "Técnica", icon: "tecnica" },
  { href: "/miembros/herramientas", label: "Herramientas", icon: "herramientas" },
];

// Solo la coach. Agenda y Contratos redirigen a cualquier otra persona, así
// que enseñárselos a una clienta sería un enlace que no lleva a ninguna parte.
const COACH: Item[] = [
  { href: "/miembros/clientas", label: "Clientas", icon: "clientas", coach: true },
  { href: "/miembros/admin", label: "Panel", icon: "panel", coach: true },
  { href: "/miembros/agenda", label: "Agenda", icon: "agenda", coach: true },
  { href: "/miembros/contratos", label: "Contratos", icon: "contratos", coach: true },
  { href: "/miembros/leads", label: "Solicitudes", icon: "leads", coach: true },
];

function activa(pathname: string, href: string): boolean {
  if (href === "/miembros") return pathname === "/miembros";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname() ?? "";
  const [masAbierto, setMasAbierto] = useState(false);

  // La hoja «Más» se cierra sola al navegar y con Escape.
  useEffect(() => { setMasAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!masAbierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMasAbierto(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [masAbierto]);

  const secundarias = admin ? [...COACH, ...RESTO] : RESTO;
  const masActivo = secundarias.some((i) => activa(pathname, i.href));

  const enlaceLateral = (i: Item) => {
    const on = activa(pathname, i.href);
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 min-h-[44px] text-[15px] font-medium transition-colors ${
          on ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <span className={on ? "text-brand" : ""}><Icono nombre={i.icon} on={on} tamano={22} /></span>
        {i.label}
      </Link>
    );
  };

  return (
    <>
      {/* ESCRITORIO: barra lateral fija */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col gap-1 border-r border-line bg-surface px-3 py-5">
        <Link href="/miembros" className="flex items-center gap-2.5 px-3 pb-5">
          <span className="w-8 h-8 rounded-[10px] bg-brand" aria-hidden="true" />
          <span className="font-bold text-[15px] tracking-tight text-ink">Programa FITCON</span>
        </Link>
        {PESTANAS.map(enlaceLateral)}
        {admin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Coach</p>
            {COACH.map(enlaceLateral)}
          </>
        )}
        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Más</p>
        {RESTO.map(enlaceLateral)}
        <div className="flex-1" />
        <a href="/api/miembros/salir" className="flex items-center gap-3 rounded-xl px-3 min-h-[44px] text-[15px] font-medium text-ink-muted hover:bg-surface-2 hover:text-ink border-t border-line pt-3 mt-2">
          <Icono nombre="salir" tamano={22} />
          Cerrar sesión
        </a>
      </aside>

      {/* MÓVIL: cabecera mínima con la marca */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-5 bg-page/90 backdrop-blur">
        <Link href="/miembros" className="font-bold text-[15px] tracking-tight text-ink">
          Programa <span className="text-brand">FITCON</span>
        </Link>
      </header>

      {/* MÓVIL: barra de pestañas */}
      <nav
        aria-label="Secciones"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch px-1 pt-1.5 bg-surface/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {PESTANAS.map((i) => {
          const on = activa(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] min-h-[52px] rounded-lg text-[10px] font-medium ${
                on ? "text-brand" : "text-ink-subtle"
              }`}
            >
              <Icono nombre={i.icon} on={on} />
              {i.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMasAbierto((v) => !v)}
          aria-expanded={masAbierto}
          aria-controls="hoja-mas"
          className={`flex flex-1 flex-col items-center justify-center gap-[3px] min-h-[52px] rounded-lg text-[10px] font-medium ${
            masAbierto || masActivo ? "text-brand" : "text-ink-subtle"
          }`}
        >
          <Icono nombre="mas" on={masAbierto || masActivo} />
          Más
        </button>
      </nav>

      {/* MÓVIL: hoja «Más» */}
      {masAbierto && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setMasAbierto(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div
            id="hoja-mas"
            className="absolute bottom-0 left-0 right-0 rounded-t-[18px] bg-surface p-3 shadow-card animate-fade-up"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              {secundarias.map((i) => {
                const on = activa(pathname, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={`flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-[17px] ${
                      on ? "bg-brand-soft text-ink" : "text-ink"
                    }`}
                  >
                    <span className={on ? "text-brand" : "text-ink-muted"}><Icono nombre={i.icon} tamano={22} /></span>
                    {i.label}
                  </Link>
                );
              })}
              <a href="/api/miembros/salir" className="flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-[17px] text-ink-muted border-t border-line mt-1 pt-1">
                <Icono nombre="salir" tamano={22} />
                Cerrar sesión
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
