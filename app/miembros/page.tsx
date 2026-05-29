import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CallCountdown from "@/components/CallCountdown";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";

export const metadata: Metadata = {
  title: "Área de miembros",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function Card({
  title,
  desc,
  children,
  soon,
}: {
  title: string;
  desc: string;
  children?: React.ReactNode;
  soon?: boolean;
}) {
  return (
    <div className="card-dark p-6 !transform-none flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-bold text-white">{title}</h3>
        {soon && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-[#252525] text-[#666666]">
            Próximamente
          </span>
        )}
      </div>
      <p className="text-sm text-[#A0A0A0] mb-4 flex-1">{desc}</p>
      {children}
    </div>
  );
}

export default function MiembrosPage() {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  const admin = isAdmin(email);

  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden min-h-screen">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />
        <div className="container-wide relative z-10 py-16">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Hola de nuevo 👋</h1>
              <p className="text-sm text-[#666666] mt-1">{email}</p>
            </div>
            <div className="flex items-center gap-2">
              {admin && (
                <Link href="/miembros/admin" className="btn-brand text-sm px-5 py-2.5">
                  Panel de la coach
                </Link>
              )}
              <a href="/api/miembros/salir" className="btn-outline text-sm px-5 py-2.5">
                Cerrar sesión
              </a>
            </div>
          </div>

          <div className="mb-5">
            <CallCountdown />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            <Card
              title="Mi perfil"
              desc="Tu cuestionario, tu foto y tus planes de nutrición y entrenamiento."
            >
              <Link href="/miembros/perfil" className="btn-brand text-sm px-6 py-3">
                Abrir mi perfil
              </Link>
            </Card>

            <Card
              title="Contenido y recursos"
              desc="Tus guías, vídeos y material del programa, alojado aquí en la plataforma."
            >
              <Link href="/miembros/contenido" className="btn-brand text-sm px-6 py-3">
                Abrir contenido
              </Link>
            </Card>

            <Card
              title="Chat con tu coach"
              desc="Tu canal privado 1:1 con Aurena. Escríbele cuando lo necesites."
            >
              <Link href="/miembros/chat" className="btn-brand text-sm px-6 py-3">
                Abrir chat
              </Link>
            </Card>

            <Card
              title="Comunidad"
              desc="Comparte tus wins diarias y tus cambios con el resto de la comunidad."
            >
              <Link href="/miembros/comunidad" className="btn-brand text-sm px-6 py-3">
                Ir a la comunidad
              </Link>
            </Card>

            <Card
              title="Seguimiento / check-ins"
              desc="Sube tu peso, fotos y notas, y sigue tu progreso con tu gráfica."
            >
              <Link href="/miembros/checkins" className="btn-brand text-sm px-6 py-3">
                Ir a mis check-ins
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
