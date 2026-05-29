import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContentUpload from "@/components/ContentUpload";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect, sbSignedUrl } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Contenido",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Content = {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  created_at: string;
};

export default async function ContenidoPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  const admin = isAdmin(email);

  let items: (Content & { url?: string })[] = [];
  try {
    const rows = await sbSelect<Content>("content", "select=*&order=created_at.desc");
    items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        url: r.file_path ? await sbSignedUrl("contenido", r.file_path, 3600).catch(() => undefined) : undefined,
      }))
    );
  } catch (e) {
    console.error("[contenido] error", e);
  }

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Contenido</h1>
            </div>
            <Link href="/miembros" className="btn-outline text-sm px-5 py-2.5">← Volver</Link>
          </div>

          {admin && <ContentUpload />}

          {items.length === 0 ? (
            <p className="text-[#A0A0A0]">Aún no hay contenido publicado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((it) => (
                <div key={it.id} className="card-dark p-5 !transform-none flex flex-col">
                  <h3 className="font-bold text-white mb-1">{it.title}</h3>
                  {it.description && <p className="text-sm text-[#A0A0A0] mb-4 flex-1">{it.description}</p>}
                  {it.url ? (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 self-start mt-auto">
                      Abrir
                    </a>
                  ) : (
                    <span className="text-xs text-[#666666]">Archivo no disponible</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
