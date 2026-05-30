import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContentUpload from "@/components/ContentUpload";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
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

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg)$/i;
type Kind = "video" | "audio" | "file";
function kindOf(path: string | null): Kind {
  if (!path) return "file";
  if (VIDEO_EXT.test(path)) return "video";
  if (AUDIO_EXT.test(path)) return "audio";
  return "file";
}

export default async function ContenidoPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  let items: (Content & { url?: string; kind: Kind })[] = [];
  try {
    const rows = await sbSelect<Content>("content", "select=*&order=created_at.desc&limit=100");
    items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        kind: kindOf(r.file_path),
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
                  {it.description && <p className="text-sm text-[#A0A0A0] mb-4">{it.description}</p>}
                  {!it.url ? (
                    <span className="text-xs text-[#666666] mt-auto">Archivo no disponible</span>
                  ) : it.kind === "video" ? (
                    <video
                      controls
                      preload="metadata"
                      playsInline
                      className="w-full rounded-lg border border-[#252525] bg-black mt-auto"
                    >
                      <source src={it.url} />
                      Tu navegador no puede reproducir este vídeo.{" "}
                      <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-[#CAFF00]">Descárgalo aquí</a>.
                    </video>
                  ) : it.kind === "audio" ? (
                    <audio controls preload="metadata" className="w-full mt-auto">
                      <source src={it.url} />
                      <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-[#CAFF00]">Descargar audio</a>
                    </audio>
                  ) : (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="btn-brand text-sm px-5 py-2.5 self-start mt-auto">
                      Abrir
                    </a>
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
