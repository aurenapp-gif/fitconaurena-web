import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PlanUpload from "@/components/PlanUpload";
import RenewalSetter from "@/components/RenewalSetter";
import RemoveClient from "@/components/RemoveClient";
import WeightChart from "@/components/WeightChart";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { PROFILE_FIELDS, renewalInfo, type Questionnaire } from "@/lib/profile";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";

export const metadata: Metadata = { title: "Clienta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; photo_path: string | null; questionnaire: Questionnaire | null; renewal_date: string | null };
type Plan = { id: string; type: string; title: string | null; file_path: string; created_at: string };
type CheckIn = { weight: number | null; created_at: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

export default async function ClientaPage({ params }: { params: { email: string } }) {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  const member = normalizeEmail(decodeURIComponent(params.email));
  if (!isValidEmail(member)) redirect("/miembros/clientas");

  let profile: Prof | null = null;
  let plans: Plan[] = [];
  let checkins: CheckIn[] = [];
  try { profile = (await sbSelect<Prof>("profiles", `select=*&email=eq.${encodeURIComponent(member)}`))[0] ?? null; } catch (e) { console.error(e); }
  try { plans = await sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(member)}&order=created_at.desc`); } catch (e) { console.error(e); }
  try { checkins = await sbSelect<CheckIn>("check_ins", `select=weight,created_at&member_email=eq.${encodeURIComponent(member)}&order=created_at.asc`); } catch (e) { console.error(e); }

  const q = profile?.questionnaire ?? {};
  const r = renewalInfo(profile?.renewal_date ?? null);

  // Gráfica y resumen de peso (solo pesos numéricos válidos).
  const points = checkins
    .map((c) => ({ date: fmtDate(c.created_at), weight: Number(c.weight) }))
    .filter((p) => Number.isFinite(p.weight));
  const firstWeight = points.length ? points[0].weight : null;
  const lastWeight = points.length ? points[points.length - 1].weight : null;
  // Positivo = kg bajados.
  const lost = firstWeight != null && lastWeight != null ? Math.round((firstWeight - lastWeight) * 10) / 10 : null;
  const plansWithUrl = await Promise.all(
    plans.map(async (p) => ({ ...p, url: await sbSignedUrl("planes", p.file_path, 3600).catch(() => undefined) }))
  );

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Clienta</span>
              <h1 className="section-title text-2xl">{profile?.display_name || member}</h1>
              <p className="text-xs text-[#666666]">{member}</p>
            </div>
            <Link href="/miembros/clientas" className="btn-outline text-sm px-5 py-2.5">← Clientas</Link>
          </div>

          {/* Renovación */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Renovación del plan (mensual)</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${r.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>{r.text}</span>
            </div>
            <RenewalSetter member={member} current={profile?.renewal_date ?? undefined} />
          </div>

          {/* Progreso de peso */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Progreso de peso</h2>
              {lost != null && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${lost > 0 ? "bg-[#CAFF00] text-[#0A0A0A]" : lost < 0 ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
                  {lost > 0 ? `▼ ${lost.toLocaleString("es-ES")} kg bajados` : lost < 0 ? `▲ ${Math.abs(lost).toLocaleString("es-ES")} kg` : "Sin cambio"}
                </span>
              )}
            </div>
            {points.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center px-2 py-3 rounded-xl border border-[#252525] bg-[#141414]">
                  <div className="text-2xl font-extrabold text-white leading-none">{firstWeight?.toLocaleString("es-ES")}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">peso inicial</div>
                </div>
                <div className="text-center px-2 py-3 rounded-xl border border-[#252525] bg-[#141414]">
                  <div className="text-2xl font-extrabold text-white leading-none">{lastWeight?.toLocaleString("es-ES")}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">peso actual</div>
                </div>
                <div className="text-center px-2 py-3 rounded-xl border border-[#CAFF00]/40 bg-[#CAFF00]/5">
                  <div className="text-2xl font-extrabold text-[#CAFF00] leading-none">{lost != null ? `${lost > 0 ? "−" : lost < 0 ? "+" : ""}${Math.abs(lost).toLocaleString("es-ES")}` : "—"}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">kg en total</div>
                </div>
              </div>
            )}
            <WeightChart points={points} />
          </div>

          {/* Subir planes */}
          <div className="card-dark p-6 !transform-none mb-6">
            <h2 className="font-bold text-white mb-4">Subir plan</h2>
            <PlanUpload member={member} />
            {plansWithUrl.length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-xs text-[#A0A0A0]">Planes subidos:</p>
                {plansWithUrl.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#252525] px-4 py-2.5">
                    <span className="text-sm text-white">
                      {p.type === "nutricion" ? "🥗 Nutrición" : "🏋️ Entrenamiento"}{p.title ? ` · ${p.title}` : ""}
                      <span className="text-[#666666] text-xs"> · {new Date(p.created_at).toLocaleDateString("es-ES")}</span>
                    </span>
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#CAFF00] text-sm">Ver</a>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cuestionario */}
          <div className="card-dark p-6 !transform-none">
            <h2 className="font-bold text-white mb-4">Cuestionario</h2>
            {Object.keys(q).length === 0 ? (
              <p className="text-sm text-[#666666]">La clienta aún no ha rellenado su cuestionario.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.id}>
                    <p className="text-xs text-[#666666]">{f.label}</p>
                    <p className="text-sm text-white whitespace-pre-wrap">{q[f.id] || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zona de eliminación */}
          <div className="card-dark p-6 !transform-none mt-6 border-[#FF6B6B]/20">
            <h2 className="font-bold text-white mb-1">Eliminar clienta</h2>
            <p className="text-sm text-[#A0A0A0] mb-4">Le quita el acceso al área de miembros. Sus datos no se borran.</p>
            <RemoveClient email={member} />
          </div>
        </div>
      </main>
    </>
  );
}
