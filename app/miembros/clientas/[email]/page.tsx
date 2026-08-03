import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import PlanUpload from "@/components/PlanUpload";
import PlanDelete from "@/components/PlanDelete";
import RenewalSetter from "@/components/RenewalSetter";
import RemoveClient from "@/components/RemoveClient";
import WeightChart from "@/components/WeightChart";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { PROFILE_FIELDS, renewalInfo, type Questionnaire } from "@/lib/profile";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { CONTRACT_BUCKET, type ContractTemplate, type ContractSignature } from "@/lib/contract";

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

  // Todas las lecturas independientes en paralelo (perfil, planes, check-ins y contrato).
  const [profile, plans, checkins, contractTpl, contractSig] = await Promise.all([
    sbSelect<Prof>("profiles", `select=*&email=eq.${encodeURIComponent(member)}`)
      .then((r0) => r0[0] ?? null).catch((e) => { console.error(e); return null; }),
    sbSelect<Plan>("plans", `select=*&member_email=eq.${encodeURIComponent(member)}&order=created_at.desc`)
      .catch((e) => { console.error(e); return [] as Plan[]; }),
    sbSelect<CheckIn>("check_ins", `select=weight,created_at&member_email=eq.${encodeURIComponent(member)}&order=created_at.asc`)
      .catch((e) => { console.error(e); return [] as CheckIn[]; }),
    sbSelect<ContractTemplate>("contract_template", "select=*&id=eq.1")
      .then((r0) => r0[0] ?? null).catch((e) => { console.error(e); return null; }),
    sbSelect<ContractSignature>("contract_signatures", `select=*&member_email=eq.${encodeURIComponent(member)}&order=signed_at.desc&limit=1`)
      .then((r0) => r0[0] ?? null).catch((e) => { console.error(e); return null; }),
  ]);

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

  // URLs firmadas en paralelo: planes + PDF del contrato.
  const [plansWithUrl, signedPdfUrl] = await Promise.all([
    Promise.all(plans.map(async (p) => ({ ...p, url: await sbSignedUrl("planes", p.file_path, 3600).catch(() => undefined) }))),
    contractSig?.signed_pdf_path ? sbSignedUrl(CONTRACT_BUCKET, contractSig.signed_pdf_path, 3600).catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const contractOutdated = !!contractSig && !!contractTpl && contractSig.version < contractTpl.version;

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
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${lost > 0 ? "bg-[#1CA0E3] text-white" : lost < 0 ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
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
                <div className="text-center px-2 py-3 rounded-xl border border-[#1CA0E3]/40 bg-[#1CA0E3]/5">
                  <div className="text-2xl font-extrabold text-[#1CA0E3] leading-none">{lost != null ? `${lost > 0 ? "−" : lost < 0 ? "+" : ""}${Math.abs(lost).toLocaleString("es-ES")}` : "—"}</div>
                  <div className="text-[11px] text-[#A0A0A0] mt-1.5">kg en total</div>
                </div>
              </div>
            )}
            <p className="text-sm text-[#A0A0A0] mb-3">
              Nombre de clienta: <span className="font-bold text-white">“{profile?.display_name || member}”</span>
            </p>
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
                    <span className="text-sm text-white min-w-0">
                      {p.type === "nutricion" ? "🥗 Nutrición" : "🏋️ Entrenamiento"}{p.title ? ` · ${p.title}` : ""}
                      <span className="text-[#666666] text-xs"> · {new Date(p.created_at).toLocaleDateString("es-ES")}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm">Ver</a>}
                      <PlanDelete id={p.id} label={p.type === "nutricion" ? "nutrición" : "entrenamiento"} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contrato */}
          <div className="card-dark p-6 !transform-none mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-white">Contrato</h2>
              {contractTpl && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${contractSig ? "bg-[#1CA0E3] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
                  {contractSig ? "✍️ Firmado" : "⏳ Pendiente de firma"}
                </span>
              )}
            </div>
            {!contractTpl ? (
              <p className="text-sm text-[#666666]">Aún no has subido la plantilla de contrato. Hazlo desde el panel de la coach.</p>
            ) : contractSig ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#A0A0A0]">
                  Firmado por <span className="font-bold text-white">{contractSig.signer_name}</span> el {new Date(contractSig.signed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}.
                </p>
                {contractOutdated && (
                  <p className="text-xs text-[#FF6B6B]">Firmó una versión anterior (v{contractSig.version}); el contrato actual es la v{contractTpl.version}.</p>
                )}
                {signedPdfUrl && (
                  <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 mt-1 inline-flex self-start">
                    Descargar contrato firmado
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#666666]">La clienta todavía no ha firmado el contrato.</p>
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
