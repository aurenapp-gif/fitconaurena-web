/** Validación de archivos subidos: tamaño máximo y tipo permitido.
 * Protege contra subidas enormes (DoS/coste) y tipos no deseados. */

const MB = 1024 * 1024;

const PLAN_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type UploadKind = "image" | "plan" | "content";

const RULES: Record<UploadKind, { maxBytes: number; allow: ((t: string) => boolean) | null }> = {
  // Fotos (perfil, check-ins, comunidad): solo imágenes, hasta 10 MB.
  image: { maxBytes: 10 * MB, allow: (t) => t.startsWith("image/") },
  // Planes de la coach: PDF / Word / imagen, hasta 25 MB.
  plan: { maxBytes: 25 * MB, allow: (t) => t.startsWith("image/") || PLAN_TYPES.includes(t.toLowerCase()) },
  // Contenido (vídeo/audio/pdf/…): cualquier tipo, hasta 100 MB (solo límite de tamaño).
  content: { maxBytes: 100 * MB, allow: null },
};

/** Devuelve un mensaje de error si el archivo NO es válido, o null si lo es. */
export function validateUpload(file: File, kind: UploadKind): string | null {
  const r = RULES[kind];
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > r.maxBytes) return `El archivo es demasiado grande (máx ${Math.round(r.maxBytes / MB)} MB).`;
  // Si el navegador no envía tipo (file.type vacío), no bloqueamos por tipo.
  if (r.allow && file.type && !r.allow(file.type)) return "Tipo de archivo no permitido.";
  return null;
}
