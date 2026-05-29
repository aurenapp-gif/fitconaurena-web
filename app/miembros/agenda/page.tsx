import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Agenda", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; renewal_date: string | null };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["L", "M", "X", "J", "V", "S", "D"];

export default async function AgendaPage({ searchParams }: { searchParams: { ym?: string } }) {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(searchParams.ym ?? "");
  const year = m ? +m[1] : now.getUTCFullYear();
  const month = m ? +m[2] : now.getUTCMonth() + 1; // 1-12
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  let profiles: Prof[] = [];
  try {
    profiles = await sbSelect<Prof>("profiles", `select=email,display_name,renewal_date&renewal_date=gte.${ym}-01&renewal_date=lte.${ym}-31`);
  } catch (e) { console.error("[agenda]", e); }

  const byDay = new Map<number, Prof[]>();
  for (const p of profiles) {
    if (!p.renewal_date) continue;
    const d = +p.renewal_date.slice(8, 10);
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Lun=0
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const today = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month ? now.getUTCDate() : -1;

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Agenda</h1>
            </div>
            <Link href="/miembros/admin" className="btn-outline text-sm px-5 py-2.5">← Panel</Link>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Link href={`/miembros/agenda?ym=${prev}`} className="btn-outline text-sm px-4 py-2">←</Link>
            <h2 className="font-black text-white capitalize">{MESES[month - 1]} {year}</h2>
            <Link href={`/miembros/agenda?ym=${next}`} className="btn-outline text-sm px-4 py-2">→</Link>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d) => <div key={d} className="text-center text-xs text-[#666666] py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className={`min-h-[84px] rounded-lg border p-1.5 ${day ? "border-[#252525] bg-[#0F0F0F]" : "border-transparent"}`}>
                {day && (
                  <>
                    <div className={`text-xs mb-1 ${day === today ? "font-black text-[#CAFF00]" : "text-[#666666]"}`}>{day}</div>
                    <div className="flex flex-col gap-1">
                      {(byDay.get(day) ?? []).map((p) => (
                        <Link key={p.email} href={`/miembros/clientas/${encodeURIComponent(p.email)}`}
                          className="block text-[10px] leading-tight rounded bg-[#CAFF00]/15 text-[#CAFF00] px-1.5 py-1 truncate"
                          title={`Renovación: ${p.display_name || p.email}`}>
                          🔄 {p.display_name || p.email.split("@")[0]}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#666666] mt-4">Las renovaciones se fijan en la ficha de cada clienta. Pincha una para abrirla.</p>
        </div>
      </main>
    </>
  );
}
