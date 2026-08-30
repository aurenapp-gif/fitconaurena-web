/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "fitconaurena.com", "www.fitconaurena.com"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    // Content-Security-Policy: lista blanca de a dónde puede pedir cosas la
    // página. Si algún día se colara código ajeno (por una dependencia, por un
    // texto mal escapado), el navegador le impediría cargarse o mandar los
    // datos fuera. Cada línea está atada a algo que la web usa de verdad:
    //
    //   supabase.co  fotos, planes y contratos (y las subidas directas)
    //   youtube-nocookie / ytimg   vídeos de testimonios
    //   calendly.com               el calendario de la página de solicitud
    //   unsplash                   imágenes de la web pública
    //
    // 'unsafe-inline' y 'unsafe-eval' en los scripts son necesarios para Next:
    // sin nonces por petición, quitarlos deja la web en blanco. Aun así la
    // política corta lo demás (a dónde se conecta, qué se puede incrustar,
    // dónde puede enviar un formulario), que es lo que aporta protección real.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://images.unsplash.com",
      "media-src 'self' blob: https://*.supabase.co",
      // `blob:` hace falta para poder LEER un archivo con
      // `fetch(URL.createObjectURL(f))`. Sin él, esa lectura la cortaba esta
      // misma política —en cualquier navegador y con cualquier archivo— y
      // Safari lo reportaba como «Load failed», idéntico a un fallo de red:
      // parecía cosa del archivo cuando era cosa nuestra. Riesgo cero, una
      // URL blob: solo la puede crear la propia página, y ya está permitido
      // en img-src, media-src, frame-src y worker-src.
      "connect-src 'self' blob: https://*.supabase.co",
      "frame-src 'self' blob: https://*.supabase.co https://www.youtube-nocookie.com https://calendly.com https://*.calendly.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      { key: "Content-Security-Policy", value: csp },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
