import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CheckinForm from "@/components/CheckinForm";
import AdminCheckinReply from "@/components/AdminCheckinReply";
import WeightChart from "@/components/WeightChart";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";

export const metadata: Metadata = { title: "Check-ins", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type CheckIn = {
  id: string;
  member_email: string;
  weight: number | null;
  note: string | null;
  photo_path: string | null;
  coach_reply: string | null;
  coach_reply_at: string | null;
  created_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

async function withPhoto(rows: CheckIn[]) {
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      photoUrl: r.photo_path ? await sbSignedUrl("checkins", r.photo_path, 3600).catch(() => undefined) : undefined,
    }))
  );
}

export default async function CheckinsPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  const admin = isAdmin(email);

  let rows: CheckIn[] = [];
  try {
    const q = admin
      ? "select=*&order=created_at.desc&limit=50"
      : `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`;
    rows = await sbSelect<CheckIn>("check_ins", q);
  } catch (e) {
    console.error("[checkins] error", e);
  }

  const items = await withPhoto(admin ? rows : [...rows].reverse());
  const points = (admin ? [] : rows)
    .filter((r) => r.weight != null)
    .map((r) => ({ date: fmt(r.created_at), weight: Number(r.weight) }));

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">{admin ? "Check-ins (todas)" : "Mis check-ins"}</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {!admin && (
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <CheckinForm />
              <div className="card-dark p-6 !transform-none">
                <h3 className="font-bold text-white mb-4">Tu progreso (peso)</h3>
                <WeightChart points={points} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {items.length === 0 ? (
              <p className="text-[#A0A0A0]">{admin ? "Aún no hay check-ins." : "Todavía no has registrado ningún check-in."}</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="card-dark p-5 !transform-none">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-3">
                      {admin && <span className="text-sm font-bold text-white">{it.member_email}</span>}
                      {it.weight != null && (
                        <span className="text-sm font-bold text-[#CAFF00]">{it.weight} kg</span>
                      )}
                    </div>
                    <span className="text-xs text-[#666666]">{fmt(it.created_at)}</span>
                  </div>
                  {it.note && <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap mb-3">{it.note}</p>}
                  {it.photoUrl && (
                    <a href={it.photoUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.photoUrl} alt="Foto del check-in" className="max-h-48 rounded-lg border border-[#252525]" />
                    </a>
                  )}
                  {it.coach_reply ? (
                    <div className="mt-3 rounded-lg border border-[#CAFF00]/30 bg-[#CAFF00]/5 px-4 py-3">
                      <p className="text-xs font-bold text-[#CAFF00] mb-1">Respuesta de tu coach</p>
                      <p className="text-sm text-white whitespace-pre-wrap">{it.coach_reply}</p>
                    </div>
                  ) : (
                    admin && <AdminCheckinReply id={it.id} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
