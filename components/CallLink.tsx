"use client";

/**
 * Botón con el que la clienta abre la grabación de su llamada. Deja constancia
 * de la apertura antes de abrirla, para que conste en su ficha, sin bloquear la
 * apertura si ese registro falla.
 */
export default function CallLink({ url, title }: { url: string; title: string }) {
  function track() {
    fetch("/api/miembros/actividad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "llamada_abierta", detail: title }),
      keepalive: true, // sobrevive a que la pestaña cambie de página
    }).catch(() => {});
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={track}
      className="btn-brand text-sm px-5 py-2.5 inline-flex items-center gap-2 self-start"
    >
      Ver la llamada
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </a>
  );
}
