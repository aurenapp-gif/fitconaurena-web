import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Agenda", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; renewal_date: string | null };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["L", "M", "X", "J", "V", "S", "D"];

export default async function AgendaPage({ searchParams }: { searchParams: { ym?: string; day?: string } }) {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(searchParams.ym ?? "");
  const year = m ? +m[1] : now.getUTCFullYear();
  const month = m ? +m[2] : now.getUTCMonth() + 1; // 1-12
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  let profiles: Prof[] = [];
  const nextFirst = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  try {
    profiles = await sbSelect<Prof>("profiles", `select=email,display_name,renewal_date&renewal_date=gte.${ym}-01&renewal_date=lt.${nextFirst}`);
  } catch (e) { console.error("[agenda]", e); }

  const byDay = new Map<number, Prof[]>();
  for (const p of profiles) {
    if (!p.renewal_date) continue;
    const d = +p.renewal_date.slice(8, 10);
    if (!Number.isInteger(d) || d < 1 || d > 31) continue; // fecha inválida → ignorar
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Lun=0
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const today = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month ? now.getUTCDate() : -1;
  const selDay = searchParams.day && /^\d{1,2}$/.test(searchParams.day) ? +searchParams.day : null;
  const selList = selDay ? byDay.get(selDay) ?? [] : [];

  return (
    <>
      <AppShell admin />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Agenda</h1>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Link href={`/miembros/agenda?ym=${prev}`} className="btn-outline text-sm px-4 py-2">←</Link>
            <h2 className="font-black text-ink capitalize">{MESES[month - 1]} {year}</h2>
            <Link href={`/miembros/agenda?ym=${next}`} className="btn-outline text-sm px-4 py-2">→</Link>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d) => <div key={d} className="text-center text-xs text-ink-subtle py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[64px]" />;
              const count = (byDay.get(day) ?? []).length;
              const isSel = day === selDay;
              return (
                <Link
                  key={i}
                  href={`/miembros/agenda?ym=${ym}&day=${day}`}
                  className={`min-h-[64px] rounded-lg border p-1.5 flex flex-col transition-colors ${
                    isSel ? "border-brand bg-brand/10" : "border-line bg-page hover:border-line-strong"
                  }`}
                >
                  <span className={`text-xs ${day === today ? "font-black text-brand" : "text-ink-muted"}`}>{day}</span>
                  {count > 0 && (
                    <span className="mt-auto self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white">
                      {count} 🔄
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Renovaciones del día seleccionado */}
          {selDay ? (
            <div className="card-dark p-5 !transform-none mt-5">
              <h3 className="font-bold text-ink mb-3">Renovaciones del {selDay} de {MESES[month - 1]}</h3>
              {selList.length === 0 ? (
                <p className="text-sm text-ink-muted">No hay renovaciones este día.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selList.map((p) => (
                    <Link key={p.email} href={`/miembros/clientas/${encodeURIComponent(p.email)}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 hover:border-brand/40">
                      <span className="text-sm text-ink">🔄 {p.display_name || p.email.split("@")[0]}</span>
                      <span className="text-xs text-ink-subtle">{p.email}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-subtle mt-4">Pulsa un día para ver sus renovaciones. Las fechas se fijan en la ficha de cada clienta.</p>
          )}
        </div>
      </main>
    </>
  );
}
