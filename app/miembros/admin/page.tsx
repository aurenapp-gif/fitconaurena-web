import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Panel admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Msg = {
  id: string;
  member_email: string;
  sender: "member" | "coach";
  body: string;
  read_by_coach: boolean;
  created_at: string;
};
type CheckIn = { id: string; member_email: string; weight: number | null; created_at: string; coach_reply: string | null };

function fmt(d: string) {
  return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  let msgs: Msg[] = [];
  let checkins: CheckIn[] = [];
  try {
    msgs = await sbSelect<Msg>("messages", "select=id,member_email,sender,body,read_by_coach,created_at&order=created_at.desc&limit=300");
  } catch (e) { console.error("[admin] msgs", e); }
  try {
    checkins = await sbSelect<CheckIn>("check_ins", "select=id,member_email,weight,created_at,coach_reply&order=created_at.desc&limit=10");
  } catch (e) { console.error("[admin] checkins", e); }

  // Agrupar conversaciones por clienta.
  const convs = new Map<string, { last: Msg; unread: number }>();
  for (const m of msgs) {
    const c = convs.get(m.member_email);
    const unreadInc = m.sender === "member" && !m.read_by_coach ? 1 : 0;
    if (!c) convs.set(m.member_email, { last: m, unread: unreadInc });
    else c.unread += unreadInc; // `last` ya es el más reciente (orden desc)
  }
  const conversations = Array.from(convs.entries());

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Panel de la coach</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chats */}
            <section>
              <h2 className="font-bold text-white mb-3">Chats</h2>
              {conversations.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">Aún no hay conversaciones.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {conversations.map(([member, { last, unread }]) => (
                    <Link
                      key={member}
                      href={`/miembros/admin/chat/${encodeURIComponent(member)}`}
                      className="card-dark p-4 !transform-none flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{member}</p>
                        <p className="text-xs text-[#A0A0A0] truncate">
                          {last.sender === "coach" ? "Tú: " : ""}{last.body}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-[#666666]">{fmt(last.created_at)}</span>
                        {unread > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CAFF00] text-[#0A0A0A]">
                            {unread} nuevo{unread > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Check-ins recientes */}
            <section>
              <h2 className="font-bold text-white mb-3">Check-ins recientes</h2>
              {checkins.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">Aún no hay check-ins.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {checkins.map((c) => (
                    <div key={c.id} className="card-dark p-4 !transform-none flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{c.member_email}</p>
                        <p className="text-xs text-[#A0A0A0]">
                          {c.weight != null ? `${c.weight} kg` : "Sin peso"} · {c.coach_reply ? "respondido" : "pendiente"}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#666666] shrink-0">{fmt(c.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/miembros/checkins" className="btn-outline text-sm px-5 py-2.5 mt-3 inline-flex">
                Ver y responder check-ins
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
