import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { memberState, enEspera } from "@/lib/guard";
import { DIAS_DESISTIMIENTO } from "@/lib/contract";

export const metadata: Metadata = { title: "Tu servicio empieza pronto", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Pantalla para quien eligió esperar los catorce días en el Anexo II-A.
 *
 * No es un castigo ni un error: es exactamente lo que pidió. El tono importa,
 * porque si parece una avería escribirá pensando que algo va mal.
 */
export default async function EsperaPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");

  const state = await memberState(email);
  // Si ya no está en espera, esta pantalla no pinta nada.
  if (!enEspera(state.accessFrom)) redirect("/miembros");

  const dia = new Date(state.accessFrom + "T12:00:00Z").toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const faltan = Math.max(
    0,
    Math.ceil(
      (new Date(state.accessFrom + "T00:00:00Z").getTime() -
        new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()) + "T00:00:00Z").getTime()) /
        86400000
    )
  );

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16 max-w-xl">
          <span className="section-tag">Área de miembros</span>
          <h1 className="section-title mb-4">Tu programa empieza el {dia.split(",")[0]}</h1>

          <div className="card-dark p-6 !transform-none mb-6">
            <p className="text-4xl font-extrabold text-[#1CA0E3] leading-none mb-1">
              {faltan} {faltan === 1 ? "día" : "días"}
            </p>
            <p className="text-sm text-[#A0A0A0] mb-5">para el {dia}</p>

            <p className="text-sm text-[#A0A0A0] leading-relaxed mb-4">
              Al firmar elegiste <strong className="text-white">esperar los {DIAS_DESISTIMIENTO} días</strong> de
              plazo de desistimiento antes de empezar. Es tu derecho y lo estamos respetando: durante
              este tiempo conservas íntegra la posibilidad de echarte atrás y recuperar el 100 % de lo
              pagado, sin dar explicaciones.
            </p>
            <p className="text-sm text-[#A0A0A0] leading-relaxed">
              Por eso todavía no hay nada activo: ni plan, ni contenidos, ni llamada. El día{" "}
              <strong className="text-white">{dia}</strong> te llegará un correo y podrás entrar con normalidad.
            </p>
          </div>

          <div className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-5 py-4">
            <p className="text-sm font-bold text-white mb-1">¿Prefieres empezar ya?</p>
            <p className="text-xs text-[#A0A0A0]">
              Escríbele a tu coach y te lo cambia. Ten en cuenta que, al empezar antes, pierdes el
              derecho a la devolución íntegra sobre los contenidos que se te entreguen.
            </p>
          </div>

          <Link href="/api/miembros/salir" className="btn-outline text-sm px-5 py-2.5 inline-flex mt-6">
            Cerrar sesión
          </Link>
        </div>
      </main>
    </>
  );
}
