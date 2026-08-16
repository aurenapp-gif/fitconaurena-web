import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import { CONTRACT_BUCKET, type ContractSignature, type ContractTemplate } from "@/lib/contract";

export const metadata: Metadata = { title: "Contratos firmados", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null };

export default async function ContratosPage() {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  // Firmas + nombres de clientas + plantillas, en paralelo.
  const [sigs, profiles, templates] = await Promise.all([
    sbSelect<ContractSignature>("contract_signatures", "select=*&order=signed_at.desc")
      .catch((e) => { console.error("[contratos] sigs", e); return [] as ContractSignature[]; }),
    sbSelect<Prof>("profiles", "select=email,display_name")
      .catch((e) => { console.error("[contratos] profiles", e); return [] as Prof[]; }),
    sbSelect<ContractTemplate>("contract_templates", "select=id,title,kind")
      .catch(() => [] as ContractTemplate[]),
  ]);
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.display_name]));
  const tplById = new Map(templates.map((t) => [t.id, t]));

  // URL firmada de cada PDF, en paralelo. Añadimos título y tipo (contrato / anexo).
  const withUrl = await Promise.all(
    sigs.map(async (s) => ({
      ...s,
      url: s.signed_pdf_path ? await sbSignedUrl(CONTRACT_BUCKET, s.signed_pdf_path, 3600).catch(() => undefined) : undefined,
      docTitle: (s.template_id && tplById.get(s.template_id)?.title) || "Contrato",
      docKind: (s.template_id && tplById.get(s.template_id)?.kind) || "contrato",
    }))
  );

  // Agrupar por clienta (email), conservando el orden por fecha desc.
  const groups = new Map<string, { name: string; items: typeof withUrl }>();
  for (const s of withUrl) {
    const name = nameByEmail.get(s.member_email) || s.signer_name || s.member_email;
    const g = groups.get(s.member_email);
    if (g) g.items.push(s);
    else groups.set(s.member_email, { name, items: [s] });
  }
  const clientas = Array.from(groups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name, "es"));

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Contratos firmados</h1>
              <p className="text-sm text-[#666666] mt-1">{sigs.length} firma{sigs.length === 1 ? "" : "s"} · {clientas.length} clienta{clientas.length === 1 ? "" : "s"}</p>
            </div>
            <Link href="/miembros/admin" className="btn-outline text-sm px-5 py-2.5">← Panel</Link>
          </div>

          {clientas.length === 0 ? (
            <div className="card-dark p-6 !transform-none">
              <p className="text-sm text-[#A0A0A0]">Todavía no hay contratos firmados. En cuanto una clienta firme, aparecerá aquí su PDF para descargar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clientas.map(([email, { name, items }]) => (
                <div key={email} className="card-dark p-5 !transform-none">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{name}</p>
                      <p className="text-xs text-[#666666] truncate">{email}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#1CA0E3] text-white shrink-0">
                      {items.length} firmado{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#252525] px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.docKind === "anexo_salud" ? "bg-[#FFB800] text-black" : "bg-[#1CA0E3] text-white"}`}>
                              {s.docKind === "anexo_salud" ? "Anexo salud" : "Contrato"}
                            </span>
                            <span className="text-sm text-white truncate">{s.docTitle}</span>
                          </div>
                          <span className="text-xs text-[#A0A0A0]">
                            Firmado el {new Date(s.signed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#1CA0E3] text-sm font-semibold shrink-0">Descargar</a>
                        ) : (
                          <span className="text-[#666666] text-xs shrink-0">No disponible</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
