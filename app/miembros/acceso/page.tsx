import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MemberLogin from "@/components/MemberLogin";

export const metadata: Metadata = {
  title: "Acceso de miembros",
  robots: { index: false, follow: false },
};

export default function AccesoPage({
  searchParams,
}: {
  searchParams: { error?: string; revoked?: string };
}) {
  return (
    <>
      <Navbar />
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />
        <div className="container-narrow relative z-10 py-24 text-center">
          <span className="section-tag">Área privada</span>
          <h1 className="section-title mb-4">Acceso para miembros</h1>
          <p className="section-sub mb-10 max-w-md mx-auto">
            Entra con tu email y te enviamos un enlace de acceso. Sin contraseñas.
          </p>
          {searchParams.revoked && (
            <p className="max-w-md mx-auto mb-5 text-sm text-[#A0A0A0]">
              Tu acceso ya no está activo. Si crees que es un error, contacta con tu coach.
            </p>
          )}
          <MemberLogin error={!!searchParams.error} />
        </div>
      </section>
    </>
  );
}
