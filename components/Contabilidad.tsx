"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filtraDecimal } from "@/lib/numeros";
import {
  METODOS, importeACent, textoEuros, type Cobro, type Venta,
} from "@/lib/contabilidad";

type Clienta = { email: string; nombre: string };
type Movimiento = (Venta | Cobro) & { tipo: "venta" | "cobro" };

/**
 * Apuntar una venta o un cobro, y ver los últimos movimientos.
 *
 * Los dos formularios son casi iguales pero están separados a propósito: lo que
 * se vende y lo que se cobra son cosas distintas, y un formulario único con un
 * desplegable de «tipo» acaba con cobros apuntados como ventas.
 */
export default function Contabilidad({
  clientas, movimientos,
}: { clientas: Clienta[]; movimientos: Movimiento[] }) {
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);

  const [tipo, setTipo] = useState<"venta" | "cobro">("cobro");
  const [member, setMember] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [metodo, setMetodo] = useState<string>("Pago único");
  const [concepto, setConcepto] = useState("");
  const [nota, setNota] = useState("");
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [msg, setMsg] = useState("");

  const cent = useMemo(() => importeACent(importe), [importe]);
  const listo = !!member && cent !== null && cent > 0 && !!fecha;

  async function guardar() {
    if (!listo || estado === "guardando") return;
    setEstado("guardando"); setMsg("");
    try {
      const res = await fetch("/api/miembros/contabilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, member, importe, fecha, metodo, concepto, nota }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setEstado("error"); setMsg(d.error ?? "No se pudo guardar.");
        return;
      }
      setImporte(""); setConcepto(""); setNota(""); setEstado("idle");
      router.refresh();
    } catch {
      setEstado("error"); setMsg("Error de conexión.");
    }
  }

  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  /** Apunta las ventas de los contratos ya firmados que falten. */
  async function importar() {
    if (importando) return;
    setImportando(true); setImportMsg("");
    try {
      const res = await fetch("/api/miembros/contabilidad", { method: "PUT" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setImportMsg(d.error ?? "No se pudo importar."); return; }
      const partes = [
        d.creadas > 0 ? `${d.creadas} apuntada${d.creadas === 1 ? "" : "s"}` : null,
        d.yaEstaban > 0 ? `${d.yaEstaban} ya estaba${d.yaEstaban === 1 ? "" : "n"}` : null,
        Array.isArray(d.sinPrecio) && d.sinPrecio.length > 0
          ? `${d.sinPrecio.length} sin precio en el titulo (apuntalas a mano)` : null,
      ].filter(Boolean);
      setImportMsg(partes.length ? partes.join(" · ") : "No habia contratos que apuntar.");
      router.refresh();
    } catch { setImportMsg("Error de conexion."); }
    finally { setImportando(false); }
  }

  async function borrar(m: Movimiento) {
    if (!confirm(`¿Borrar este apunte de ${textoEuros(m.importe_cent)}?`)) return;
    try {
      const res = await fetch(`/api/miembros/contabilidad?tipo=${m.tipo}&id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch { /* se queda como está: no se miente sobre lo borrado */ }
  }

  const campo = "w-full rounded-xl border border-line bg-page px-4 py-3 text-[16px] text-ink outline-none focus:border-brand";
  const nombreDe = (email: string) => clientas.find((c) => c.email === email)?.nombre || email;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface rounded-[14px] p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          {(["cobro", "venta"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`flex-1 rounded-xl py-2.5 text-[15px] font-semibold transition-colors ${
                tipo === t ? "bg-brand text-white" : "bg-page text-ink-muted"}`}>
              {t === "cobro" ? "Apuntar un cobro" : "Apuntar una venta"}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-ink-muted -mt-1">
          {tipo === "cobro"
            ? "Dinero que ya ha entrado en la cuenta."
            : "Lo que se ha comprometido a pagar, aunque todavía no lo hayas cobrado."}
        </p>

        <select value={member} onChange={(e) => setMember(e.target.value)} className={campo} aria-label="Clienta">
          <option value="">— Elige la clienta —</option>
          {clientas.map((c) => <option key={c.email} value={c.email}>{c.nombre}</option>)}
        </select>

        <div className="flex gap-2">
          <input value={importe} onChange={(e) => setImporte(filtraDecimal(e.target.value))}
            inputMode="decimal" placeholder="Importe en €" aria-label="Importe" className={campo} />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha" className={campo} />
        </div>

        <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={campo} aria-label="Método">
          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {tipo === "venta" && (
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} maxLength={120}
            placeholder="Concepto (ej. Programa 12 meses)" aria-label="Concepto" className={campo} />
        )}
        <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200}
          placeholder="Nota (opcional)" aria-label="Nota" className={campo} />

        {estado === "error" && <p role="alert" className="text-[15px] text-danger">{msg}</p>}

        <button type="button" onClick={guardar} disabled={!listo || estado === "guardando"}
          className="btn-brand w-full py-3.5 text-[16px] disabled:opacity-50">
          {estado === "guardando" ? "Guardando…" : cent !== null && cent > 0
            ? `Apuntar ${textoEuros(cent)}` : "Apuntar"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Últimos movimientos</p>
          <button type="button" onClick={importar} disabled={importando}
            className="btn-outline text-[13px] px-3 py-1.5 disabled:opacity-50">
            {importando ? "Importando…" : "Importar contratos firmados"}
          </button>
        </div>
        {importMsg && <p className="text-[13px] text-ink-muted mb-2">{importMsg}</p>}
        {movimientos.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Todavía no hay nada apuntado.</p>
        ) : (
          <div className="bg-surface rounded-[14px] divide-y divide-line">
            {movimientos.map((m) => (
              <div key={`${m.tipo}-${m.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className={`shrink-0 w-2 h-2 rounded-full ${m.tipo === "cobro" ? "bg-success" : "bg-brand"}`}
                  aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold truncate">{nombreDe(m.member_email)}</span>
                  <span className="block text-[13px] text-ink-muted truncate">
                    {m.tipo === "cobro" ? "Cobro" : "Venta"} · {m.fecha}
                    {m.metodo ? ` · ${m.metodo}` : ""}
                    {"concepto" in m && m.concepto ? ` · ${m.concepto}` : ""}
                    {"origen" in m && m.origen ? " · del contrato" : ""}
                  </span>
                </span>
                <span className={`text-[16px] font-bold tabular-nums shrink-0 ${m.tipo === "cobro" ? "text-success" : "text-ink"}`}>
                  {textoEuros(m.importe_cent)}
                </span>
                <button type="button" onClick={() => borrar(m)} aria-label="Borrar apunte"
                  className="shrink-0 text-[13px] text-danger px-1">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
