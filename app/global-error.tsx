"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ background: "#0A0A0A", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <p style={{ fontWeight: 900, fontSize: 20, marginBottom: 24 }}>
            fit<span style={{ color: "#1CA0E3" }}>con</span>aurena
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 12px" }}>Algo ha ido mal</h1>
          <p style={{ color: "#A0A0A0", maxWidth: 420, lineHeight: 1.6, margin: "0 0 28px" }}>
            Ha ocurrido un error temporal. Vuelve a intentarlo o recarga en unos segundos.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => reset()} style={{ background: "#1CA0E3", color: "#0A0A0A", fontWeight: 700, border: 0, padding: "13px 26px", borderRadius: 12, cursor: "pointer" }}>
              Reintentar
            </button>
            <a href="/" style={{ border: "1px solid #252525", color: "#fff", textDecoration: "none", padding: "13px 26px", borderRadius: 12 }}>
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
