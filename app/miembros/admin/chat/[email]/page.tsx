import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ChatRoom from "@/components/ChatRoom";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Chat (admin)", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Msg = { id: string; sender: "member" | "coach"; body: string; created_at: string };

export default async function AdminChatPage({ params }: { params: { email: string } }) {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!isAdmin(me)) redirect("/miembros");

  const member = normalizeEmail(decodeURIComponent(params.email));
  if (!isValidEmail(member)) redirect("/miembros/admin");

  let messages: Msg[] = [];
  try {
    messages = await sbSelect<Msg>(
      "messages",
      `select=id,sender,body,created_at&member_email=eq.${encodeURIComponent(member)}&order=created_at.asc&limit=300`
    );
  } catch (e) {
    console.error("[admin chat] error", e);
  }

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Chat con clienta</span>
              <h1 className="section-title text-2xl">{member}</h1>
            </div>
            <Link href="/miembros/admin" className="btn-outline text-sm px-5 py-2.5">← Panel</Link>
          </div>
          <ChatRoom role="coach" member={member} initialMessages={messages} />
        </div>
      </main>
    </>
  );
}
