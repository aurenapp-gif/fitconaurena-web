/**
 * La foto y el vídeo de cada ejercicio.
 *
 * El catálogo (texto) vive en el repositorio; los medios NO pueden vivir ahí:
 * son archivos que se suben desde el móvil en el gimnasio, el día que se
 * graban, sin pasar por un despliegue. Por eso van en la base de datos y en el
 * almacenamiento, atados al identificador de la ficha.
 *
 * Si la tabla todavía no existe, todo esto devuelve «no hay medios» y el
 * catálogo sigue funcionando: una ficha sin foto se lee igual.
 */

import { isMissingTable, sbDelete, sbSelect, sbSignedUrl, sbUpsert } from "./supabase";

export type Medios = {
  exercise_id: string;
  image_path: string | null;
  video_url: string | null;
};

/** El bucket donde viven las fotos de los ejercicios. */
export const BUCKET_EJERCICIOS = "ejercicios";

/**
 * El identificador de un vídeo de YouTube, o null.
 *
 * Solo YouTube, y solo el identificador: lo que se guarda es lo que se va a
 * incrustar. Guardar la URL entera dejaría entrar cualquier cosa en un iframe,
 * y la política de seguridad de la web solo deja incrustar youtube-nocookie.
 */
export function idDeYoutube(entrada: string): string | null {
  const t = entrada.trim();
  if (!t) return null;
  // El identificador suelto, tal cual.
  if (/^[\w-]{11}$/.test(t)) return t;
  let u: URL;
  try { u = new URL(t); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})$/);
    if (m) return m[1];
  }
  return null;
}

/** Para incrustarlo sin que YouTube siga a nadie. */
export function urlDeIncrustacion(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** Los medios de todos los ejercicios, por identificador. */
export async function mediosDelCatalogo(): Promise<Map<string, Medios>> {
  try {
    const filas = await sbSelect<Medios>("exercise_media", "select=exercise_id,image_path,video_url");
    return new Map(filas.map((f) => [f.exercise_id, f]));
  } catch (e) {
    if (!isMissingTable(e)) console.error("[ejercicios-media] leer", e);
    return new Map();
  }
}

/** Los medios de uno solo, con la foto ya firmada para poder pintarla. */
export async function mediosDe(id: string): Promise<{ imagen: string | null; video: string | null }> {
  let fila: Medios | undefined;
  try {
    const filas = await sbSelect<Medios>(
      "exercise_media", `select=exercise_id,image_path,video_url&exercise_id=eq.${encodeURIComponent(id)}`
    );
    fila = filas[0];
  } catch (e) {
    if (!isMissingTable(e)) console.error("[ejercicios-media] leer uno", e);
    return { imagen: null, video: null };
  }
  if (!fila) return { imagen: null, video: null };

  let imagen: string | null = null;
  if (fila.image_path) {
    // Una hora: lo que dura mirar un catálogo de sobra.
    imagen = await sbSignedUrl(BUCKET_EJERCICIOS, fila.image_path, 3600).catch(() => null);
  }
  return { imagen, video: fila.video_url };
}

/** Guardar (o cambiar) los medios de un ejercicio. */
export async function guardarMedios(
  id: string,
  cambios: { image_path?: string | null; video_url?: string | null },
  por: string
): Promise<void> {
  await sbUpsert("exercise_media", {
    exercise_id: id,
    ...cambios,
    updated_by: por,
    updated_at: new Date().toISOString(),
  }, "exercise_id");
}

/** Quitar del todo los medios de un ejercicio. */
export async function borrarMedios(id: string): Promise<void> {
  await sbDelete("exercise_media", `exercise_id=eq.${encodeURIComponent(id)}`);
}

/** El SQL que falta por ejecutar, para poder enseñarlo si la tabla no está. */
export const SETUP_SQL = `create table if not exists public.exercise_media (
  exercise_id text primary key,
  image_path text,
  video_url text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.exercise_media enable row level security;`;
