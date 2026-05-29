import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CommunityFeed from "@/components/CommunityFeed";
import { SESSION_COOKIE, verifySession } from "@/lib/members";

export const metadata: Metadata = { title: "Comunidad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ComunidadPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Comunidad</h1>
              <p className="text-sm text-[#666666] mt-1">Comparte tus wins y avances con el resto.</p>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>
          <CommunityFeed />
        </div>
      </main>
    </>
  );
}
