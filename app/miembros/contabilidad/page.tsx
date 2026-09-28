import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import Contabilidad from "@/components/Contabilidad";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import {
  mesDe, porClienta, resumen, textoEuros, textoEurosCorto,
  type Cobro, type Venta,
} from "@/lib/contabilidad";

export const metadata: Metadata = { title: "Contabilidad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null };

export default async function ContabilidadPage() {
  // Solo la coach. Aquí está la facturación del negocio entero.
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  const [ventas, cobros, profiles, members] = await Promise.all([
    sbSelect<Venta>("ventas", "select=*&order=fecha.desc&limit=2000").catch(() => [] as Venta[]),
    sbSelect<Cobro>("cobros", "select=*&order=fecha.desc&limit=2000").catch(() => [] as Cobro[]),
    sbSelect<Prof>("profiles", "select=email,display_name").catch(() => [] as Prof[]),
    getMembers().then((ms) => ms.filter((m) => !isAdmin(m.email))).catch(() => [] as { email: string; name: string }[]),
  ]);

  const nombres = new Map(profiles.map((p) => [p.email, p.display_name?.trim() || ""]));
  const nombreDe = (e: string) => nombres.get(e) || members.find((m) => m.email === e)?.name || e;

  const mes = new Date().toISOString().slice(0, 7);
  const esteMes = resumen(ventas, cobros, mes);
  const total = resumen(ventas, cobros);
  const filas = porClienta(ventas, cobros, nombreDe);

  // Sin tabla todavía, las consultas devuelven vacío y la página sale en
  // blanco sin decir por qué. Mejor decirlo.
  const sinTabla = ventas.length === 0 && cobros.length === 0;

  const clientas = members
    .map((m) => ({ email: m.email, nombre: nombreDe(m.email) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const movimientos = [
    ...ventas.map((v) => ({ ...v, tipo: "venta" as const })),
    ...cobros.map((c) => ({ ...c, tipo: "cobro" as const })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 40);

  const Cifra = ({ etiqueta, valor, tono = "" }: { etiqueta: string; valor: string; tono?: string }) => (
    <div className="bg-surface rounded-[14px] px-4 py-3.5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">{etiqueta}</p>
      <p className={`text-[26px] font-bold tracking-tight tabular-nums mt-0.5 ${tono}`}>{valor}</p>
    </div>
  );

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="page-title mb-1">Contabilidad</h1>
          <p className="text-[15px] text-ink-muted mb-5">
            Lo facturado es lo que se han comprometido a pagar. Lo cobrado es lo que hay en el banco.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Cifra etiqueta={`Facturado en ${mesDe(`${mes}-01`)}`} valor={textoEurosCorto(esteMes.facturado)} />
            <Cifra etiqueta="Cobrado este mes" valor={textoEurosCorto(esteMes.cobrado)} tono="text-success" />
            <Cifra etiqueta="Pendiente de cobro" valor={textoEurosCorto(total.pendiente)} tono={total.pendiente > 0 ? "text-warn" : ""} />
            <Cifra etiqueta="Cobrado en total" valor={textoEurosCorto(total.cobrado)} />
          </div>

          {sinTabla && (
            <p className="text-[15px] text-warn bg-warn-soft rounded-[14px] px-4 py-3 mb-6">
              Si acabas de estrenar esto y no guarda nada, falta ejecutar <strong>supabase/contabilidad.sql</strong> en Supabase.
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Contabilidad clientas={clientas} movimientos={movimientos} />

            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Por clienta</p>
              {filas.length === 0 ? (
                <p className="text-[15px] text-ink-muted">Cuando apuntes algo, aquí verás quién te debe qué.</p>
              ) : (
                <div className="bg-surface rounded-[14px] divide-y divide-line">
                  {filas.map((f) => (
                    <div key={f.email} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] font-semibold truncate">{f.nombre}</span>
                        <span className={`text-[16px] font-bold tabular-nums shrink-0 ${f.pendiente > 0 ? "text-warn" : "text-success"}`}>
                          {f.pendiente > 0 ? textoEuros(f.pendiente) : "Al día"}
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-muted mt-0.5">
                        {textoEuros(f.cobrado)} cobrados de {textoEuros(f.facturado)}
                        {f.ultimoCobro ? ` · último el ${f.ultimoCobro}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
