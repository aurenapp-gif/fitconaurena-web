import Link from "next/link";
import Navbar from "@/components/Navbar";
import { COMPANY, companyLine } from "@/lib/company";
import { TERMS_VERSION } from "@/lib/terms";

/** Plantilla común de las páginas legales: privacidad, términos, cookies. */
export default function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="max-w-2xl">
            <span className="section-tag">Aviso legal</span>
            <h1 className="section-title">{title}</h1>
            <p className="text-xs text-[#666666] mt-2 mb-8">
              Última actualización: {updated} · Versión {TERMS_VERSION}
            </p>

            <article className="prose-legal flex flex-col gap-4 text-sm text-[#A0A0A0] leading-relaxed">
              {children}
            </article>

            <div className="mt-10 pt-6 border-t border-[#252525] text-xs text-[#666666]">
              <p className="mb-1">Responsable del tratamiento:</p>
              <p className="text-white">{COMPANY.name}</p>
              <p>{companyLine().replace(COMPANY.name + ", ", "")}</p>
              <p>Contacto: <a href={`mailto:${COMPANY.email}`} className="text-[#1CA0E3]">{COMPANY.email}</a></p>

              <nav className="flex gap-4 flex-wrap mt-6">
                <Link href="/legal/privacidad" className="text-[#1CA0E3] hover:underline">Privacidad</Link>
                <Link href="/legal/terminos" className="text-[#1CA0E3] hover:underline">Términos</Link>
                <Link href="/legal/cookies" className="text-[#1CA0E3] hover:underline">Cookies</Link>
              </nav>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
