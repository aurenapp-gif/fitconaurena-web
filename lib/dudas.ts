/**
 * Buzón de dudas anónimas.
 *
 * La idea: las preguntas que más frenan a alguien son justo las que no se
 * atreve a hacer delante del grupo. Aquí las deja sin dar la cara, las demás
 * pueden decir "a mí también me pasa" y la coach responde por escrito o con un
 * vídeo.
 *
 * De la duda NO se guarda quién la escribió (ver supabase/dudas.sql). Este
 * módulo son solo tipos y listas cerradas, sin nada de servidor: lo importan
 * también los componentes de navegador. El hash de voto vive aparte
 * (lib/dudasVoto.ts) para no arrastrar `crypto` al bundle del cliente.
 */

export type DudaStatus = "nueva" | "para_llamada" | "para_video" | "resuelta";

export type Duda = {
  id: string;
  categoria: string;
  body: string;
  answer: string | null;
  answer_url: string | null;
  answered_at: string | null;
  status: DudaStatus;
  hidden: boolean;
  /** Solo lo ve la coach: si va relleno, la duda es privada. */
  reply_email?: string | null;
  created_at: string;
};

/** Temas del buzón. La caja en blanco recibe poquísimo; elegir tema y ver un
 * ejemplo es lo que da permiso a preguntar. */
export const CATEGORIES = [
  { id: "entrenamiento", label: "Entrenamiento", icon: "🏋️", example: "No noto el ejercicio donde debería, ¿lo estoy haciendo mal?" },
  { id: "nutricion",     label: "Nutrición",     icon: "🥗", example: "Llego a la noche con mucha hambre y me lo salto todo." },
  { id: "cabeza",        label: "Cabeza y motivación", icon: "🧠", example: "Me machaco cuando me salto un día y acabo dejándolo." },
  { id: "vida_social",   label: "Vida social",   icon: "🍷", example: "Cada finde hay plan y siento que tiro por tierra la semana." },
  { id: "plataforma",    label: "La plataforma", icon: "📱", example: "No sé dónde ver mi plan de entrenamiento." },
  { id: "otras",         label: "Otras",         icon: "💬", example: "" },
] as const;

export const STATUSES: { id: DudaStatus; label: string; color: string }[] = [
  { id: "nueva",        label: "Sin responder",   color: "#666666" },
  { id: "para_llamada", label: "En la llamada",   color: "#1CA0E3" },
  { id: "para_video",   label: "Haré un vídeo",   color: "#A855F7" },
  { id: "resuelta",     label: "Resuelta",        color: "#22C55E" },
];

export function isCategory(v: unknown): boolean {
  return typeof v === "string" && CATEGORIES.some((c) => c.id === v);
}

export function isStatus(v: unknown): v is DudaStatus {
  return typeof v === "string" && STATUSES.some((s) => s.id === v);
}

export function categoryOf(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function statusOf(id: string) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}
