/**
 * El onboarding: los tres vídeos que ve una clienta nada más entrar.
 *
 * Sustituye a la lista de «primeros pasos» que se tachaba sola. Aquella decía
 * lo que le faltaba por hacer; estos le explican qué va a hacer y por qué, que
 * es lo que de verdad no sabe el primer día.
 *
 * PARA AÑADIR LOS VÍDEOS: pega el enlace en `url`, abajo. Vale tanto un enlace
 * de Vimeo como de YouTube; se reconoce solo. Mientras un vídeo no tenga
 * enlace, no se enseña —ni a medias ni con un hueco—, así que se pueden ir
 * subiendo de uno en uno.
 */

export type VideoOnboarding = {
  /** Identificador estable. Se usa en la dirección y en el registro de vistas. */
  id: string;
  titulo: string;
  /** Una línea de qué va, para que sepa si le toca ahora o después. */
  descripcion: string;
  /** Enlace de Vimeo o de YouTube. Vacío = todavía no está. */
  url: string;
};

export const ONBOARDING: VideoOnboarding[] = [
  {
    id: "primeros-pasos",
    titulo: "Primeros pasos",
    descripcion: "Cómo moverte por aquí y qué hacer esta primera semana.",
    url: "",
  },
  {
    id: "estrategia",
    titulo: "Estrategia y plan de acción",
    descripcion: "Por qué tu plan es el que es y cómo vamos a llegar a tu objetivo.",
    url: "",
  },
  {
    id: "kpis",
    titulo: "KPIs y objetivos diarios",
    descripcion: "Qué medimos cada día y cada quince, y por qué eso es lo que marca el progreso.",
    url: "",
  },
];

export function buscaVideoOnboarding(id: string): VideoOnboarding | undefined {
  return ONBOARDING.find((v) => v.id === id);
}

/** Los que ya tienen enlace. Si no hay ninguno, la sección no aparece. */
export function onboardingDisponible(): VideoOnboarding[] {
  return ONBOARDING.filter((v) => fuenteDeVideo(v.url) !== null);
}

export type FuenteVideo =
  | { plataforma: "vimeo"; id: string; hash: string | null }
  | { plataforma: "youtube"; id: string };

/**
 * De dónde sale el vídeo, a partir del enlace.
 *
 * Vimeo tiene dos formas: el enlace normal (vimeo.com/123456789) y el de un
 * vídeo privado, que lleva un segundo número detrás (vimeo.com/123456789/ab12cd).
 * Ese segundo trozo es la llave y hay que pasarla al reproductor, porque si no
 * el vídeo privado no se abre.
 */
export function fuenteDeVideo(urlOrId: string): FuenteVideo | null {
  const s = (urlOrId ?? "").trim();
  if (!s) return null;

  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d{6,})(?:[/?]([\w-]+))?/i);
  if (vimeo) return { plataforma: "vimeo", id: vimeo[1], hash: vimeo[2] ?? null };
  if (/^\d{6,}$/.test(s)) return { plataforma: "vimeo", id: s, hash: null };

  if (/^[\w-]{11}$/.test(s)) return { plataforma: "youtube", id: s };
  const yt = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  if (yt) return { plataforma: "youtube", id: yt[1] };

  return null;
}

/** La dirección que se le da al reproductor, ya lista para incrustar. */
export function urlDeReproductor(f: FuenteVideo): string {
  if (f.plataforma === "vimeo") {
    const llave = f.hash ? `h=${encodeURIComponent(f.hash)}&` : "";
    return `https://player.vimeo.com/video/${f.id}?${llave}title=0&byline=0&portrait=0&dnt=1&playsinline=1`;
  }
  return `https://www.youtube-nocookie.com/embed/${f.id}?rel=0&playsinline=1`;
}
