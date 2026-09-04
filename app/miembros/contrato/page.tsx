import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContractSign, { type ContractItem } from "@/components/ContractSign";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";
import {
  CONTRACT_BUCKET,
  fieldsFor,
  type ContractAssignment,
  type ContractTemplate,
} from "@/lib/contract";

export const metadata: Metadata = { title: "Firmar contrato", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Profile = {
  display_name: string | null;
  full_name: string | null;
  address: string | null;
  postal_code: string | null;
  contracts_exempt?: boolean | null;
};

/**
 * Pantalla obligatoria: si la clienta tiene contratos asignados sin firmar,
 * el guard la trae aquí antes de nada. Al firmar todos, `requireMember` deja
 * de redirigir y ya puede usar la app.
 */
export default async function ContratoPage() {
  const email = await requireMember({ skipContractGate: true });

  const [profileRows, assignmentsRaw] = await Promise.all([
    sbSelect<Profile>("profiles", `select=display_name,full_name,address,postal_code,contracts_exempt&email=eq.${encodeURIComponent(email)}`)
      .catch(() =>
        // La columna de exención aún no existe: leemos sin ella.
        sbSelect<Profile>("profiles", `select=display_name,full_name,address,postal_code&email=eq.${encodeURIComponent(email)}`)
          .catch((e) => { console.error("[contrato] profile", e); return [] as Profile[]; })
      ),
    sbSelect<ContractAssignment>(
      "contract_assignments",
      `select=*&member_email=eq.${encodeURIComponent(email)}&status=eq.pendiente&order=assigned_at.asc`
    ).catch((e) => { console.error("[contrato] assignments", e); return [] as ContractAssignment[]; }),
  ]);
  const profile = profileRows[0];
  // Exenta = clienta anterior a la firma obligatoria. No está bloqueada aquí:
  // si le han asignado algo puede firmarlo, pero también volverse atrás.
  const exempt = profile?.contracts_exempt !== false;

  // Cargar plantillas asociadas.
  const templates = assignmentsRaw.length
    ? await sbSelect<ContractTemplate>(
        "contract_templates",
        `select=*&id=in.(${assignmentsRaw.map((a) => a.template_id).join(",")})`
      ).catch(() => [] as ContractTemplate[])
    : [];
  const tplById = new Map(templates.map((t) => [t.id, t]));

  const items: ContractItem[] = [];
  for (const a of assignmentsRaw) {
    const tpl = tplById.get(a.template_id);
    if (!tpl) continue;
    const url = await sbSignedUrl(CONTRACT_BUCKET, tpl.file_path, 3600).catch(() => undefined);
    items.push({
      assignmentId: a.id,
      templateId: tpl.id,
      templateTitle: tpl.title,
      kind: tpl.kind,
      templateUrl: url,
      fields: fieldsFor(tpl.kind),
    });
  }

  // Pre-rellenar con datos del perfil si están disponibles (para que no lo
  // repita todo si ya se dieron de alta con el formulario de bienvenida).
  const defaultValues: Record<string, string> = {};
  if (profile?.full_name) defaultValues.nombre_completo = profile.full_name;
  if (profile?.address) defaultValues.domicilio = profile.address;
  if (profile?.postal_code) defaultValues.codigo_postal = profile.postal_code;

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="section-tag">{exempt ? "Documentos" : "Antes de empezar"}</span>
                <h1 className="section-title">Firma tu contrato</h1>
              </div>
              {/* Las clientas exentas no están bloqueadas: pueden volver cuando quieran. */}
              {exempt && <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>}
            </div>
            <p className="text-sm text-ink-muted mt-2 max-w-2xl">
              {exempt
                ? <>Tu coach ha dejado {items.length === 1 ? "este documento" : "estos documentos"} a tu disposición. Firmarlo{items.length === 1 ? "" : "s"} es opcional y puedes hacerlo cuando quieras.</>
                : <>Para poder empezar tu programa necesitamos que rellenes y firmes {items.length === 1 ? "este documento" : "estos documentos"}. Es rápido y queda guardado con validez legal (firma electrónica simple, eIDAS).</>}
            </p>
          </div>

          <ContractSign
            items={items}
            defaultName={profile?.display_name ?? profile?.full_name ?? ""}
            defaultValues={defaultValues}
          />

          {items.length === 0 && (
            <div className="mt-6">
              <Link href="/miembros" className="btn-brand text-sm px-6 py-3 inline-flex">Ir al área privada</Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
