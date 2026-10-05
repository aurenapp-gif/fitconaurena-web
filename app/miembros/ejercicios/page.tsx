import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import CatalogoEjercicios from "@/components/CatalogoEjercicios";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { CATALOGO } from "@/lib/catalogo";
import { mediosDelCatalogo } from "@/lib/ejercicios-media";

export const metadata: Metadata = { title: "Ejercicios", robots: { index: false, follow: false } };
// Los medios se suben desde la propia pantalla: no puede quedarse cacheada.
export const dynamic = "force-dynamic";

/**
 * El catálogo de ejercicios. Coach y equipo.
 *
 * No lee nada de la base de datos: el catálogo vive en el repositorio, así que
 * esta pantalla se pinta sola y no puede quedarse en blanco porque Supabase
 * tenga un mal día.
 */
export default async function EjerciciosPage() {
  const me = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!me) redirect("/miembros/acceso");
  if (!(await puedeGestionarClientas(me))) redirect("/miembros");

  // Qué fichas tienen ya vídeo o foto. Es lo que convierte «llenar el
  // catálogo» en una tarea con final visible en vez de en una sensación.
  const medios = await mediosDelCatalogo();
  const conVideo = Array.from(medios.values()).filter((m) => m.video_url).map((m) => m.exercise_id);
  const conFoto = Array.from(medios.values()).filter((m) => m.image_path).map((m) => m.exercise_id);

  return (
    <>
      <AppShell admin ceo={isAdmin(me)} />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          <h1 className="page-title mb-1">Ejercicios</h1>
          <p className="text-[17px] text-ink-muted mb-6">
            El catálogo de la casa: cómo se hace cada uno, cómo se deja la máquina y por cuál cambiarlo.
          </p>
          <CatalogoEjercicios ejercicios={CATALOGO} conVideo={conVideo} conFoto={conFoto} />
        </div>
      </main>
    </>
  );
}
