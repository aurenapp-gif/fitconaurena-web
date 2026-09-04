"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Armazón de navegación del área de miembros.
 *
 * En escritorio, una barra lateral fija con todas las secciones. En móvil —que
 * es donde la mayoría abre la app— una barra de cinco pestañas abajo, al
 * alcance del pulgar, y una hoja «Más» con el resto. El menú desplegable que
 * había antes escondía todo tras una palabra («Miembros»); esto lo saca a la
 * vista.
 *
 * Es un componente cliente porque necesita la ruta actual para marcar la
 * sección activa. No sabe nada de la sesión: el `admin` se lo pasa la página,
 * que es quien la ha comprobado en el servidor.
 */

type Item = { href: string; label: string; icon: keyof typeof ICONOS; coach?: boolean };

// Iconos de trazo, 24×24, todos del mismo grosor. Nada de emoji: se ven
// distintos en cada móvil y no cambian de color con el estado.
const ICONOS = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  checkins: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  avisos: <path d="M4 4h16v12H8l-4 4z" />,
  mas: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  dudas: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" /></>,
  tecnica: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  herramientas: <path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.7-6.7z" />,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  contratos: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h4" /></>,
  clientas: <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 20a5 5 0 0 1 6.5-4.8" /></>,
  panel: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
  leads: <><path d="M4 5h16l-6 8v6l-4-2v-4z" /></>,
  salir: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
} as const;

function Icono({ nombre, tamano = 22 }: { nombre: keyof typeof ICONOS; tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[nombre]}
    </svg>
  );
}

// Las cinco de abajo, en el orden en que se usan. «Avisos» es Comunicados:
// cabe en una pestaña y dice lo mismo.
const PESTANAS: Item[] = [
  { href: "/miembros", label: "Inicio", icon: "inicio" },
  { href: "/miembros/perfil", label: "Perfil", icon: "perfil" },
  { href: "/miembros/checkins", label: "Check-ins", icon: "checkins" },
  { href: "/miembros/comunicados", label: "Avisos", icon: "avisos" },
];

// Lo demás: en la barra lateral va todo seguido; en móvil, dentro de «Más».
// Los contratos de la clienta viven en su perfil; la página /contratos es el
// archivo de la coach, por eso no está aquí.
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
        className={`flex items-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold transition-colors ${
          on ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <span className={on ? "text-brand" : ""}><Icono nombre={i.icon} tamano={20} /></span>
        {i.label}
      </Link>
    );
  };

  return (
    <>
      {/* ESCRITORIO: barra lateral fija */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col gap-1 border-r border-line bg-surface px-3 py-5">
        <Link href="/miembros" className="flex items-center gap-2.5 px-3 pb-5">
          <span className="w-8 h-8 rounded-lg bg-brand" aria-hidden="true" />
          <span className="font-extrabold text-[15px] tracking-tight text-ink">Programa FITCON</span>
        </Link>
        {PESTANAS.map(enlaceLateral)}
        {admin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Coach</p>
            {COACH.map(enlaceLateral)}
          </>
        )}
        <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Más</p>
        {RESTO.map(enlaceLateral)}
        <div className="flex-1" />
        <a href="/api/miembros/salir" className="flex items-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink border-t border-line pt-3 mt-2">
          <Icono nombre="salir" tamano={20} />
          Cerrar sesión
        </a>
      </aside>

      {/* MÓVIL: cabecera mínima con la marca */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-5 bg-surface/90 backdrop-blur border-b border-line">
        <Link href="/miembros" className="font-extrabold text-[15px] tracking-tight text-ink">
          Programa <span className="text-brand">FITCON</span>
        </Link>
      </header>

      {/* MÓVIL: barra de pestañas */}
      <nav
        aria-label="Secciones"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch px-1.5 pt-1.5 bg-surface border-t border-line"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {PESTANAS.map((i) => {
          const on = activa(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 min-h-[52px] rounded-lg text-[10.5px] font-bold ${
                on ? "text-brand" : "text-ink-subtle"
              }`}
            >
              <Icono nombre={i.icon} />
              {i.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMasAbierto((v) => !v)}
          aria-expanded={masAbierto}
          aria-controls="hoja-mas"
          className={`flex flex-1 flex-col items-center justify-center gap-1 min-h-[52px] rounded-lg text-[10.5px] font-bold ${
            masAbierto || masActivo ? "text-brand" : "text-ink-subtle"
          }`}
        >
          <Icono nombre="mas" />
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
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-surface p-3 shadow-card animate-fade-up"
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
                    className={`flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-[15px] font-semibold ${
                      on ? "bg-brand-soft text-ink" : "text-ink"
                    }`}
                  >
                    <span className={on ? "text-brand" : "text-ink-muted"}><Icono nombre={i.icon} tamano={20} /></span>
                    {i.label}
                  </Link>
                );
              })}
              <a href="/api/miembros/salir" className="flex items-center gap-3 rounded-xl px-3 min-h-[48px] text-[15px] font-semibold text-ink-muted border-t border-line mt-1 pt-1">
                <Icono nombre="salir" tamano={20} />
                Cerrar sesión
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
