import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ChatRoom from "@/components/ChatRoom";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect } from "@/lib/supabase";

export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Msg = { id: string; sender: "member" | "coach"; body: string; created_at: string };

export default async function ChatPage() {
  const email = await requireMember();
  if (isAdmin(email)) redirect("/miembros/admin"); // la coach usa el panel

  let messages: Msg[] = [];
  try {
    messages = await sbSelect<Msg>(
      "messages",
      `select=id,sender,body,created_at&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc&limit=300`
    );
  } catch (e) {
    console.error("[chat] error", e);
  }

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Chat con tu coach</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>
          <ChatRoom role="member" initialMessages={messages} />
        </div>
      </main>
    </>
  );
}
