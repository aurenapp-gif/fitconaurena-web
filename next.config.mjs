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
    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      // CSP mínima: impide que la web sea embebida por terceros (clickjacking).
      // No restringe scripts/estilos para no romper Next/Tailwind.
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
