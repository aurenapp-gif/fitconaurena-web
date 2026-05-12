import Link from "next/link";

const footerLinks = {
  programa: {
    title: "El Servicio",
    links: [
      { href: "/que-es", label: "Qué es Fit con Aurena" },
      { href: "/metodologia", label: "Metodología" },
      { href: "/tarifas", label: "Precios y planes" },
      { href: "/testimonios", label: "Casos de éxito" },
    ],
  },
  recursos: {
    title: "Recursos",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/faq", label: "Preguntas frecuentes" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { href: "/privacidad", label: "Política de privacidad" },
      { href: "/terminos", label: "Términos y condiciones" },
      { href: "/cookies", label: "Política de cookies" },
    ],
  },
};

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <style>{`
        .footer-social-link { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); transition: all 0.2s; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .footer-social-link:hover { background: rgba(244,114,182,0.15); border-color: rgba(244,114,182,0.3); color: #F472B6; }
      `}</style>
      <footer style={{ background: "#0D1117", color: "rgba(255,255,255,0.7)" }}>
        <div className="container-wide py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>FA</div>
                <span className="font-bold text-lg text-white">Fit con <span style={{ color: "#F472B6" }}>Aurena</span></span>
              </Link>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                Servicio personalizado 1:1 de nutrición y entrenamiento para mujeres. App con seguimiento del ciclo menstrual y acompañamiento real para conseguir tu objetivo.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { href: "https://instagram.com/fitconaurena", label: "IG", icon: "📸" },
                  { href: "https://youtube.com/@fitconaurena", label: "YT", icon: "▶️" },
                  { href: "https://tiktok.com/@fitconaurena", label: "TK", icon: "🎵" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="footer-social-link">
                    <span style={{ fontSize: "14px" }}>{s.icon}</span>
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3 className="text-white font-semibold text-sm mb-4">{section.title}</h3>
                <ul className="flex flex-col gap-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm transition-colors duration-200 hover:text-white" style={{ color: "rgba(255,255,255,0.5)" }}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="divider-dark mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>© {currentYear} Fit con Aurena. Todos los derechos reservados.</p>
            <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>Hecho con</span><span style={{ color: "#F472B6" }}>♥</span><span>para nuestra comunidad</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
