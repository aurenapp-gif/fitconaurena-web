"use client";

import { useState } from "react";

/** Aviso de "falta ejecutar esto en Supabase" con el SQL listo para copiar.
 * Solo lo ve la coach: si falta la tabla, es un paso de configuración suyo. */
export default function SetupSql({ sql, title }: { sql: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
      <p className="text-sm font-bold text-warn mb-1">⚙️ {title}</p>
      <p className="text-sm text-ink-muted mb-3">
        Entra en <strong className="text-ink">Supabase → SQL Editor → New query</strong>, pega esto y pulsa{" "}
        <strong className="text-ink">Run</strong>. Es un paso que solo se hace una vez.
      </p>
      <pre className="text-[11px] leading-relaxed text-ink-muted bg-page border border-line rounded-lg p-3 overflow-x-auto">
        {sql}
      </pre>
      <button type="button" onClick={copy} className="btn-outline text-xs px-4 py-2 mt-3">
        {copied ? "Copiado ✓" : "Copiar SQL"}
      </button>
    </div>
  );
}
