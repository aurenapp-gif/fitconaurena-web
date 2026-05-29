import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession, isAdmin, getMembers } from "@/lib/members";
import { renewalInfo } from "@/lib/profile";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Clientas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Prof = { email: string; display_name: string | null; renewal_date: string | null };

export default async function ClientasPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) redirect("/miembros");

  const members = (await getMembers()).filter((m) => !isAdmin(m.email));
  let profiles: Prof[] = [];
  try { profiles = await sbSelect<Prof>("profiles", "select=email,display_name,renewal_date"); } catch (e) { console.error(e); }
  const byEmail = new Map(profiles.map((p) => [p.email, p]));

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Solo administración</span>
              <h1 className="section-title">Clientas</h1>
              <p className="text-sm text-[#666666] mt-1">{members.length} activa{members.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {members.length === 0 ? (
            <p className="text-[#A0A0A0]">Aún no tienes clientas dadas de alta (grupo &quot;Miembros&quot; en MailerLite).</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {members.map((m) => {
                const p = byEmail.get(m.email);
                const r = renewalInfo(p?.renewal_date ?? null);
                return (
                  <Link key={m.email} href={`/miembros/clientas/${encodeURIComponent(m.email)}`} className="card-dark p-4 !transform-none flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p?.display_name || m.name}</p>
                      <p className="text-xs text-[#666666] truncate">{m.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${r.urgent ? "bg-[#FF6B6B] text-white" : "border border-[#252525] text-[#A0A0A0]"}`}>
                      {r.text}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
