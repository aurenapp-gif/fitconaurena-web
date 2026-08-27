/** Cuestionario del perfil de la clienta (datos para su plan personalizado). */

export type Field = {
  id: string;
  label: string;
  type: "number" | "text" | "textarea" | "select" | "date";
  options?: string[];
  hint?: string;
};

export const PROFILE_FIELDS: Field[] = [
  {
    id: "fecha_nacimiento",
    label: "Fecha de nacimiento",
    type: "date",
    hint: "Con la fecha exacta tu coach puede ajustar mejor tu plan que con la edad a secas.",
  },
  { id: "altura", label: "Altura (cm)", type: "number" },
  { id: "peso_actual", label: "Peso actual (kg) — opcional", type: "number" },
  { id: "peso_objetivo", label: "Peso objetivo (kg) — opcional", type: "number" },
  { id: "objetivo", label: "Objetivo principal", type: "select", options: ["Perder grasa", "Tonificar", "Ganar músculo", "Salud y hábitos"] },
  { id: "nivel_actividad", label: "Nivel de actividad diaria", type: "select", options: ["Sedentaria", "Ligera", "Activa", "Muy activa"] },
  { id: "pasos_dia", label: "Pasos diarios de media", type: "number" },
  { id: "dias_entreno", label: "Días que puedes entrenar por semana", type: "select", options: ["1-2", "3-4", "5-6"] },
  { id: "lugar_entreno", label: "¿Dónde entrenas?", type: "select", options: ["Casa", "Gimnasio", "Ambos"] },
  { id: "experiencia", label: "Experiencia entrenando", type: "select", options: ["Principiante", "Intermedia", "Avanzada"] },
  { id: "comidas_dia", label: "Comidas al día que prefieres", type: "select", options: ["3", "4", "5"] },
  { id: "lesiones", label: "Lesiones o limitaciones", type: "textarea" },
  { id: "alergias", label: "Alergias o intolerancias", type: "textarea" },
  { id: "alimentos_evitar", label: "Alimentos que no te gustan o quieres evitar", type: "textarea" },
  { id: "ciclo", label: "Ciclo menstrual", type: "select", options: ["Regular", "Irregular", "No aplica"] },
  { id: "notas", label: "Algo más que tu coach deba saber", type: "textarea" },
];

export type Questionnaire = Record<string, string>;

/** Campos mínimos para poder ENVIAR el cuestionario (y arrancar el ciclo de
 * avisos del plan). Usado en cliente (habilitar el botón) y servidor (validar).
 *
 * Los pesos NO son obligatorios a propósito: hay clientas que prefieren no
 * pesarse, y deben poder enviar su cuestionario igualmente (pueden seguir su
 * progreso con medidas y fotos). */
export const REQUIRED_QUESTIONNAIRE = ["fecha_nacimiento", "altura", "objetivo"];

/**
 * ¿Están todos los campos obligatorios rellenos?
 *
 * La edad del cuestionario antiguo cuenta como fecha de nacimiento a estos
 * efectos. Si no contara, a las clientas que ya lo rellenaron se les volvería a
 * abrir el paso «Completa tu cuestionario» en su portada por un cambio nuestro,
 * como si no lo hubieran hecho nunca. En su perfil sí se les pide la fecha
 * exacta, pero sin bloquearlas.
 */
export function questionnaireComplete(q: Questionnaire): boolean {
  return REQUIRED_QUESTIONNAIRE.every((k) => {
    if ((q[k] ?? "").toString().trim() !== "") return true;
    return k === "fecha_nacimiento" && (q.edad ?? "").trim() !== "";
  });
}

/** Fecha (YYYY-MM-DD) un mes después de `from` (por defecto, hoy). */
export function plusOneMonthISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Es una fecha YYYY-MM-DD que existe de verdad?
 *
 * Con comprobar solo el formato no basta: «2027-13-45» lo cumple y llega a la
 * base de datos, que lo rechaza con un error feo (500) en vez de un aviso
 * claro. Aquí se reconstruye la fecha y se comprueba que Javascript no la haya
 * corrido de día.
 */
export function isValidDateISO(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Duración del servicio contratado. Hoy todos son de doce meses. */
export const SERVICE_MONTHS = 12;

/**
 * Fecha (YYYY-MM-DD) en que vence el servicio: doce meses desde el alta.
 *
 * `setMonth` con desbordamiento hace lo correcto para nosotros: un alta el 31
 * de agosto vencería el 31 de agosto siguiente; y en los meses cortos (31 de
 * enero → 31 de febrero) Javascript lo pasa al 2 o 3 de marzo, un día de más
 * que nunca perjudica a la clienta.
 */
export function serviceEndISO(from: Date | string = new Date()): string {
  const d = typeof from === "string" ? new Date(from + "T12:00:00Z") : new Date(from);
  d.setMonth(d.getMonth() + SERVICE_MONTHS);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Hay que ponerle vencimiento nuevo al dar de alta a esta clienta?
 *
 * Sí cuando no tiene ninguno (alta nueva) o cuando el que tiene ya venció
 * (renovación de verdad). NO cuando le queda uno por delante: repetir el alta
 * de una clienta —porque falló el correo, porque se corrige el nombre— no puede
 * regalarle otros doce meses. Ya ha pasado que un alta se repite el mismo día.
 *
 * @param actual  vencimiento que ya consta, si lo hay
 * @returns la fecha nueva a guardar, o null si hay que dejar el que tiene
 */
export function nuevoVencimiento(actual: string | null | undefined, now: Date = new Date()): string | null {
  if (actual) {
    // Vale todo el día del vencimiento: se compara contra su final.
    const vigente = new Date(actual + "T23:59:59Z").getTime() > now.getTime();
    if (vigente) return null;
  }
  return serviceEndISO(now);
}

/** Info del vencimiento del servicio, para pintarlo en la ficha. */
export function serviceEndInfo(date: string | null | undefined): { text: string; urgent: boolean; days: number | null } {
  if (!date) return { text: "Sin fecha de vencimiento", urgent: false, days: null };
  const days = Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Servicio vencido hace ${-days} d`, urgent: true, days };
  if (days === 0) return { text: "Vence hoy", urgent: true, days };
  if (days <= 60) return { text: `Vence en ${days} día${days > 1 ? "s" : ""}`, urgent: days <= 30, days };
  const meses = Math.round(days / 30);
  return { text: `Quedan ${meses} meses`, urgent: false, days };
}

/** Info de renovación del plan (se renueva mensualmente). */
export function renewalInfo(date: string | null): { text: string; urgent: boolean; days: number | null } {
  if (!date) return { text: "Sin fecha de renovación", urgent: false, days: null };
  const days = Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Renovación vencida (${-days} d)`, urgent: true, days };
  if (days === 0) return { text: "¡Renueva hoy!", urgent: true, days };
  return { text: `Renueva en ${days} día${days > 1 ? "s" : ""}`, urgent: days <= 5, days };
}

/** Limpia el cuestionario quedándose solo con campos conocidos (string). */
/**
 * Campos que ya no se preguntan pero que NO se borran de lo ya guardado.
 *
 * El cuestionario pedía «Edad» y ahora pide la fecha de nacimiento, que es
 * exacta y no caduca. De una edad no se puede deducir la fecha, así que la de
 * las clientas que ya respondieron se conserva: si se cayera del saneado, la
 * primera vez que cualquiera de ellas guardase su perfil ese dato desaparecería
 * sin que nadie se enterara.
 */
const CAMPOS_HEREDADOS = ["edad"];

export function sanitizeQuestionnaire(input: unknown): Questionnaire {
  const out: Questionnaire = {};
  if (input && typeof input === "object") {
    const datos = input as Record<string, unknown>;
    const copiar = (id: string) => {
      const v = datos[id];
      if (typeof v === "string") out[id] = v.slice(0, 1000);
      else if (typeof v === "number") out[id] = String(v);
    };
    for (const f of PROFILE_FIELDS) copiar(f.id);
    for (const id of CAMPOS_HEREDADOS) copiar(id);
  }
  return out;
}

/**
 * Edad a partir de la fecha de nacimiento (YYYY-MM-DD). Null si no hay fecha o
 * no es válida. Descuenta el año si aún no ha llegado el cumpleaños.
 */
export function edadDe(fecha: string | null | undefined): number | null {
  if (!fecha || !isValidDateISO(fecha)) return null;
  const hoy = new Date();
  const n = new Date(fecha + "T00:00:00");
  let edad = hoy.getFullYear() - n.getFullYear();
  const cumpleYa =
    hoy.getMonth() > n.getMonth() ||
    (hoy.getMonth() === n.getMonth() && hoy.getDate() >= n.getDate());
  if (!cumpleYa) edad -= 1;
  return edad >= 0 && edad < 130 ? edad : null;
}

/** Fecha de nacimiento en castellano: «14 de marzo de 1990». */
export function fechaLarga(fecha: string | null | undefined): string | null {
  if (!fecha || !isValidDateISO(fecha)) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(fecha + "T12:00:00Z"));
}

/**
 * Margen de edad que se acepta como fecha de nacimiento.
 *
 * No es un filtro de admisión —de eso se encarga el formulario de solicitud—
 * sino un detector de erratas: al teclear la fecha es fácil dejarse el año en
 * el actual, y entonces la coach vería «0 años» en la ficha sin sospechar que
 * el dato está mal. Cualquier edad real cabe de sobra en este margen.
 */
export const EDAD_MIN = 14;
export const EDAD_MAX = 100;

/** Fechas límite (YYYY-MM-DD) para el `min`/`max` del selector de fecha. */
export function rangoNacimiento(now: Date = new Date()): { min: string; max: string } {
  const limite = (anios: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear() - anios, now.getUTCMonth(), now.getUTCDate()));
    return d.toISOString().slice(0, 10);
  };
  return { min: limite(EDAD_MAX), max: limite(EDAD_MIN) };
}

/** Mensaje de error de la fecha de nacimiento, o null si está bien (o vacía). */
export function errorNacimiento(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const edad = edadDe(s);
  if (edad === null) return "Esa fecha de nacimiento no existe. Revísala.";
  if (edad < EDAD_MIN || edad > EDAD_MAX) return "Revisa la fecha de nacimiento: el año no parece correcto.";
  return null;
}
