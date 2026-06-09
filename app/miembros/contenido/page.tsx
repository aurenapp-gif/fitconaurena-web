import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ContentUpload from "@/components/ContentUpload";
import SectionManager, { type Section } from "@/components/SectionManager";
import DeleteContentButton from "@/components/DeleteContentButton";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect, sbSignedUrl, sbUpsert } from "@/lib/supabase";

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
  section_id: number | null;
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

type Item = Content & { url?: string; kind: Kind };

function ContentCard({ it, admin }: { it: Item; admin: boolean }) {
  return (
    <div className="card-dark p-5 !transform-none flex flex-col">
      <h3 className="font-bold text-white mb-1">{it.title}</h3>
      {it.description && <p className="text-sm text-[#A0A0A0] mb-4">{it.description}</p>}
      {!it.url ? (
        <span className="text-xs text-[#666666] mt-auto">Archivo no disponible</span>
      ) : it.kind === "video" ? (
        <video controls preload="metadata" playsInline className="w-full rounded-lg border border-[#252525] bg-black mt-auto">
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
      {admin && <DeleteContentButton id={it.id} title={it.title} />}
    </div>
  );
}

export default async function ContenidoPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  let items: Item[] = [];
  let sections: Section[] = [];
  try {
    const [rows, secs] = await Promise.all([
      sbSelect<Content>("content", "select=*&order=created_at.asc&limit=200"),
      sbSelect<Section>("content_sections", "select=id,name,position&order=position.asc").catch(() => []),
    ]);
    sections = secs;
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

  // Marca que la clienta ha visto el contenido (completa el paso del onboarding).
  if (!admin) {
    sbUpsert("profiles", { email, content_seen: true, updated_at: new Date().toISOString() }).catch(() => {});
  }

  // Agrupa el contenido por sección (en el orden de las secciones); lo que no
  // tenga sección va al final en "Otros".
  const bySection = new Map<number, Item[]>();
  const noSection: Item[] = [];
  for (const it of items) {
    if (it.section_id != null && sections.some((s) => Number(s.id) === Number(it.section_id))) {
      const k = Number(it.section_id);
      bySection.set(k, [...(bySection.get(k) ?? []), it]);
    } else {
      noSection.push(it);
    }
  }

  const hasAnything = items.length > 0 || sections.length > 0;

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

          {admin && (
            <>
              <SectionManager sections={sections} />
              <ContentUpload sections={sections} />
            </>
          )}

          {!hasAnything ? (
            <p className="text-[#A0A0A0]">Aún no hay contenido publicado.</p>
          ) : (
            <div className="flex flex-col gap-10">
              {sections.map((s, i) => {
                const list = bySection.get(Number(s.id)) ?? [];
                const first = i === 0;
                return (
                  <section key={s.id}>
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      {first && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#CAFF00] text-[#0A0A0A]">
                          Empieza por aquí
                        </span>
                      )}
                      <h2 className="font-black text-white text-xl">{s.name}</h2>
                    </div>
                    {first && (
                      <p className="text-sm text-[#A0A0A0] -mt-2 mb-4">
                        Es tu fase inicial: <strong className="text-white">mira todos los vídeos</strong> antes de seguir.
                      </p>
                    )}
                    {list.length === 0 ? (
                      <p className="text-sm text-[#666666]">Aún no hay vídeos en esta sección.</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {list.map((it) => <ContentCard key={it.id} it={it} admin={admin} />)}
                      </div>
                    )}
                  </section>
                );
              })}

              {noSection.length > 0 && (
                <section>
                  <h2 className="font-black text-white text-xl mb-4">{sections.length > 0 ? "Otros" : "Contenido"}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {noSection.map((it) => <ContentCard key={it.id} it={it} admin={admin} />)}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
