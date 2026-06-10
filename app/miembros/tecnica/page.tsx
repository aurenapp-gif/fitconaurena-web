import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import TechniqueUpload from "@/components/TechniqueUpload";
import TechniqueReply from "@/components/TechniqueReply";
import TechniqueDelete from "@/components/TechniqueDelete";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";

export const metadata: Metadata = { title: "Revisión de técnica", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Review = {
  id: string;
  member_email: string;
  exercise: string | null;
  note: string | null;
  video_path: string | null;
  coach_reply: string | null;
  coach_reply_path: string | null;
  coach_reply_at: string | null;
  created_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

// La nota de voz de la coach lleva el prefijo "audio-" (o extensión de audio).
function isAudioReply(path: string | null): boolean {
  if (!path) return false;
  return /-audio-/.test(path) || /\.(m4a|mp3|aac|wav|ogg)$/i.test(path);
}

export default async function TecnicaPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  let rows: Review[] = [];
  try {
    const q = admin
      ? "select=*&order=created_at.desc&limit=200"
      : `select=*&member_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=100`;
    rows = await sbSelect<Review>("technique_reviews", q);
  } catch (e) {
    console.error("[tecnica] error", e);
  }

  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      videoUrl: r.video_path ? await sbSignedUrl("tecnica", r.video_path, 3600).catch(() => undefined) : undefined,
      replyUrl: r.coach_reply_path ? await sbSignedUrl("tecnica", r.coach_reply_path, 3600).catch(() => undefined) : undefined,
    }))
  );

  // Sin responder primero (para la coach).
  const pending = admin ? items.filter((i) => !i.coach_reply && !i.coach_reply_path).length : 0;

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Revisión de técnica</h1>
              {admin && pending > 0 && <p className="text-sm text-[#CAFF00] mt-1">{pending} sin corregir</p>}
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {!admin && <TechniqueUpload />}

          {items.length === 0 ? (
            <p className="text-[#A0A0A0]">{admin ? "Aún no hay vídeos de técnica." : "Aún no has subido ningún vídeo. ¡Sube el primero arriba!"}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((it) => {
                const replied = !!(it.coach_reply || it.coach_reply_path);
                return (
                  <div key={it.id} className="card-dark p-5 !transform-none flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-white">{it.exercise || "Vídeo de técnica"}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${replied ? "bg-[#CAFF00] text-[#0A0A0A]" : "border border-[#252525] text-[#A0A0A0]"}`}>
                        {replied ? "Corregido" : "Pendiente"}
                      </span>
                    </div>
                    {admin && <p className="text-xs text-[#666666] mb-1">{it.member_email}</p>}
                    <p className="text-[10px] text-[#666666] mb-2">{fmt(it.created_at)}</p>
                    {it.note && <p className="text-sm text-[#A0A0A0] mb-3 whitespace-pre-wrap">{it.note}</p>}

                    {it.videoUrl ? (
                      <video controls preload="metadata" playsInline className="w-full rounded-lg border border-[#252525] bg-black">
                        <source src={it.videoUrl} />
                      </video>
                    ) : (
                      <span className="text-xs text-[#666666]">Vídeo no disponible (puede haberse borrado tras la corrección).</span>
                    )}

                    {/* Corrección de la coach */}
                    {(it.coach_reply || it.replyUrl) && (
                      <div className="mt-3 rounded-lg border border-[#CAFF00]/30 bg-[#CAFF00]/5 px-4 py-3">
                        <p className="text-xs font-bold text-[#CAFF00] mb-1">Corrección de tu coach</p>
                        {it.coach_reply && <p className="text-sm text-white whitespace-pre-wrap mb-2">{it.coach_reply}</p>}
                        {it.replyUrl && (
                          isAudioReply(it.coach_reply_path) ? (
                            <audio controls preload="none" src={it.replyUrl} className="w-full" />
                          ) : (
                            <video controls preload="metadata" playsInline className="w-full rounded-lg border border-[#252525] bg-black">
                              <source src={it.replyUrl} />
                            </video>
                          )
                        )}
                      </div>
                    )}

                    {/* Formulario de respuesta (coach, si aún no ha corregido) */}
                    {admin && !replied && <TechniqueReply id={it.id} />}

                    <div className="mt-3">
                      <TechniqueDelete id={it.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
