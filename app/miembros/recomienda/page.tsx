import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { afiliadosVisible, COMISION_EUROS, puedeVerAfiliados } from "@/lib/afiliados";

export const metadata: Metadata = { title: "Recomienda y gana", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * «Recomienda y gana 200 €»: el programa de recomendación, explicado.
 *
 * Es informativo a propósito. No hay códigos ni enlaces de seguimiento: quien
 * recomienda se lo dice a su coach, y ya está. Montar un sistema de códigos
 * para un programa que todavía no se ha estrenado sería construir sobre algo
 * que nadie ha usado.
 */
export default async function RecomiendaPage() {
  const email = await requireMember();
  if (!verifySession(cookies().get(SESSION_COOKIE)?.value)) redirect("/miembros/acceso");

  // Mientras el programa esté apagado, solo lo ve la coach: así puede mirarlo
  // tal como lo verán ellas antes de prometer nada. Para una clienta, leer
  // esto es una promesa de dinero que ya no se puede retirar sin quedar mal.
  const visible = await afiliadosVisible();
  if (!puedeVerAfiliados(visible, email)) redirect("/miembros");

  const Paso = ({ n, titulo, texto }: { n: number; titulo: string; texto: string }) => (
    <li className="flex items-start gap-3.5">
      <span className="shrink-0 mt-0.5 w-[26px] h-[26px] rounded-full bg-brand text-white flex items-center justify-center text-[13px] font-bold">
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-[17px] font-semibold text-ink leading-snug">{titulo}</span>
        <span className="block text-[15px] text-ink-muted mt-0.5 leading-relaxed">{texto}</span>
      </span>
    </li>
  );

  return (
    <>
      <AppShell />
      <main className="app-main relative min-h-screen">
        <div className="container-content relative z-10 py-6 lg:py-12">
          {!visible && (
            <p className="rounded-[14px] bg-warn-soft text-warn px-4 py-3 mb-5 text-[15px] font-semibold">
              Vista previa. Las clientas todavía no ven esto: se enciende desde el Panel.
            </p>
          )}

          <h1 className="page-title mb-1">Recomienda y gana {COMISION_EUROS} €</h1>
          <p className="text-[17px] text-ink-muted mb-6">Por cada mujer que entre al programa.</p>

          <div className="rounded-[16px] bg-ink text-page p-6 mb-5">
            <p className="text-[32px] font-bold tracking-tight leading-none mb-3">{COMISION_EUROS} €</p>
            <p className="text-[17px] leading-relaxed">
              Si estás contenta con lo que estás consiguiendo y conoces a alguna mujer a la que esto le
              pueda cambiar el año, recomiéndaselo. <strong className="font-semibold">Si entra al programa,
              son {COMISION_EUROS} € para ti.</strong>
            </p>
            <p className="text-[15px] text-page/70 leading-relaxed mt-3">
              Por cada una. Sin tope: si entran tres, son {COMISION_EUROS * 3} €.
            </p>
          </div>

          <div className="bg-surface rounded-[14px] p-5 mb-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-4">Cómo funciona</p>
            <ol className="flex flex-col gap-4">
              <Paso n={1} titulo="Háblale del programa"
                texto="Tú ya sabes lo que es por dentro: cómo se trabaja, qué se siente y qué resultados da. Eso no lo cuenta mejor nadie." />
              <Paso n={2} titulo="Dile que me escriba y que te mencione"
                texto="Con que diga que vas tú detrás es suficiente. Así sé que viene de tu parte." />
              <Paso n={3} titulo={`Cuando entre, son ${COMISION_EUROS} € tuyos`}
                texto="Me pongo en contacto contigo para dártelos. No tienes que hacer nada más." />
            </ol>
          </div>

          <div className="bg-surface rounded-[14px] p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted mb-2">
              A quién se lo dirías
            </p>
            <p className="text-[15px] text-ink leading-relaxed">
              A la que lleva años empezando los lunes. A la que entrena pero no ve cambios. A la que te
              pregunta qué estás haciendo porque te nota distinta. Si encaja, encaja; y si no, tampoco pasa
              nada: aquí no se trata de convencer a nadie.
            </p>
          </div>

          <p className="text-[13px] text-ink-subtle mt-5">
            ¿Dudas? Pregúntame por donde siempre.
          </p>
        </div>
      </main>
    </>
  );
}
