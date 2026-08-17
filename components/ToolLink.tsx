"use client";

/**
 * Botón de acceso a una herramienta externa. Registra el uso antes de abrirla,
 * para que quede constancia en la ficha de la clienta, sin bloquear la apertura
 * si ese registro falla.
 */
export default function ToolLink({ id, name, url }: { id: string; name: string; url: string }) {
  function track() {
    fetch("/api/miembros/actividad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "herramienta_abierta", detail: name }),
      keepalive: true, // sobrevive a que la pestaña cambie de página
    }).catch(() => {});
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={track}
      data-tool={id}
      className="btn-brand text-sm px-6 py-3 inline-flex items-center gap-2 self-start"
    >
      Acceder a la herramienta
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M7 17L17 7M17 7H8M17 7v9" />
      </svg>
    </a>
  );
}
