import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Piezas de las listas agrupadas del área privada, al estilo de iOS: un grupo
 * blanco sobre el fondo cálido, filas de 46 px con el detalle en gris a la
 * derecha y flecha fina cuando llevan a otro sitio, etiqueta gris encima y
 * explicación gris debajo.
 *
 * Componentes de servidor: no llevan estado. Lo que necesite interacción se
 * envuelve aparte.
 */

export function Grupo({ children, className = "", label, foot }: { children: ReactNode; className?: string; label?: string; foot?: ReactNode }) {
  return (
    <section className={`flex flex-col ${className}`}>
      {label && <span className="group-label">{label}</span>}
      <div className="bg-surface rounded-[14px] overflow-hidden flex flex-col divide-y divide-line [&>*]:ml-0">{children}</div>
      {foot && <span className="group-foot">{foot}</span>}
    </section>
  );
}

export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 text-line-strong ${className}`}>
      <path d="M1 1l6 6-6 6" />
    </svg>
  );
}

/**
 * Fila: título (y subtítulo opcional) a la izquierda, detalle a la derecha.
 * Con `href` es un enlace con flecha; sin él, una fila estática.
 */
export function Fila({ titulo, sub, detalle, href, children, tono = "muted", accion }: {
  titulo: ReactNode;
  sub?: ReactNode;
  detalle?: ReactNode;
  href?: string;
  /** Contenido extra bajo el título (barras, chips). */
  children?: ReactNode;
  /** Color del detalle: gris (por defecto), tinta o marca. */
  tono?: "muted" | "ink" | "brand" | "warn" | "success";
  /** Enlace de acción a la derecha en lugar de la flecha («Hacerlo»). */
  accion?: { href: string; label: string };
}) {
  const tonoCls = { muted: "text-ink-subtle", ink: "text-ink", brand: "text-brand", warn: "text-warn", success: "text-success" }[tono];
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] text-ink leading-[22px] truncate">{titulo}</div>
        {sub && <div className="text-[15px] text-ink-muted leading-5 mt-px">{sub}</div>}
        {children}
      </div>
      {detalle != null && <span className={`text-[17px] whitespace-nowrap shrink-0 ${tonoCls}`}>{detalle}</span>}
      {accion && <Link href={accion.href} className="text-[17px] text-brand font-medium shrink-0 min-h-[44px] inline-flex items-center">{accion.label}</Link>}
      {href && <Chevron />}
    </>
  );
  const cls = "flex items-center justify-between gap-3 min-h-[46px] px-4 py-2.5";
  return href ? <Link href={href} className={`${cls} active:bg-surface-2 transition-colors`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/** Fila de acción centrada en azul («Abrir mi plan»). */
export function FilaAccion({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center justify-center min-h-[46px] px-4 text-[17px] text-brand font-medium ${className}`}>{children}</div>;
}

/**
 * Nota de la coach dentro de un grupo: avatar con su inicial, «Tu coach» en
 * gris y el texto. Es su voz en la app de la clienta, que se note.
 */
export function NotaCoach({ texto, inicial = "C", fecha }: { texto: string; inicial?: string; fecha?: string }) {
  return (
    <div className="flex gap-2.5 px-4 py-3 items-start">
      <span className="w-7 h-7 rounded-full bg-warn-soft text-warn text-xs font-bold flex items-center justify-center shrink-0" aria-hidden="true">{inicial}</span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[13px] text-ink-muted">Tu coach{fecha ? ` · ${fecha}` : ""}</span>
        <p className="text-[15px] leading-5 text-ink whitespace-pre-wrap">{texto}</p>
      </div>
    </div>
  );
}

/** Barra fina de progreso (pasos, meta). */
export function Barra({ pct, tono = "brand", className = "" }: { pct: number; tono?: "brand" | "success" | "warn"; className?: string }) {
  const bg = { brand: "bg-brand", success: "bg-success", warn: "bg-warn" }[tono];
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`h-1 rounded-full bg-surface-2 overflow-hidden ${className}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Candado con texto pequeño: «Solo tú y tu coach veis estas fotos». */
export function Privado({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      {children}
    </span>
  );
}
