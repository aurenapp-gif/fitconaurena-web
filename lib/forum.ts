/** Foro de preguntas y respuestas de la comunidad (por temáticas, con hilos y
 *  buscador). Tablas: forum_topics, forum_questions, forum_replies. */

export type Topic = { id: number; name: string; position: number };

export type Question = {
  id: string;
  topic_id: number | null;
  author_email: string;
  author_name: string;
  title: string;
  body: string | null;
  resolved: boolean;
  pinned: boolean;
  created_at: string;
  last_activity: string;
};

export type Reply = {
  id: string;
  question_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
};

/** Nombre a mostrar de la clienta: el del perfil; si no, el inicio del email. */
export function displayName(profileName: string | null | undefined, email: string): string {
  return profileName?.trim() || email.split("@")[0];
}
