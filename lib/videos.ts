/** Vídeos de la landing /aplicar (YouTube). Pega aquí los enlaces.
 * Acepta URLs completas (youtu.be, watch?v=, /shorts/, /embed/) o el ID a secas.
 * Si están vacíos, las secciones de vídeo no se muestran. */

// VSL (vídeo de ventas). Ej.: "https://youtu.be/XXXXXXXXXXX"
export const VSL_URL = "";

// Testimonios en vídeo. Añade un enlace por línea.
export const TESTIMONIAL_URLS: string[] = [
  // "https://youtu.be/XXXXXXXXXXX",
];

// true si los testimonios son verticales (Shorts / vídeo de móvil); false si horizontales.
export const TESTIMONIALS_VERTICAL = true;

/** Extrae el ID de YouTube de una URL o ID. Devuelve null si no es válido. */
export function youtubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const s = urlOrId.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}
