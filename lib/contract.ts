/**
 * Contratos firmables por la clienta (firma electrónica simple, eIDAS).
 *
 * Modelo:
 *  - `contract_templates`: la coach sube varias plantillas (por ejemplo,
 *    contratos por precio 1197/1497/1897) y el ANEXO DE SALUD, común a todas.
 *  - `contract_assignments`: por cada clienta, qué plantillas debe firmar. El
 *    contrato lo elige la coach al dar de alta; el anexo se asigna a todas.
 *  - `contract_signatures`: firma emitida sobre una asignación concreta. Guarda
 *    el trazo, los campos rellenados por la clienta (DNI, dirección, teléfono,
 *    datos de salud…), IP, navegador, fecha/hora y el PDF firmado final.
 */

/** Bucket privado de Storage: plantillas, firmas y PDFs firmados. */
export const CONTRACT_BUCKET = "contratos";

/** Tipos de plantilla que sabemos manejar. */
export type ContractKind = "contrato" | "anexo_salud";

/** Plantilla vigente (varias por tipo son válidas). */
export type ContractTemplate = {
  id: string;
  title: string;
  kind: ContractKind;
  file_path: string;
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** Asignación de una plantilla a una clienta. */
export type ContractAssignment = {
  id: string;
  member_email: string;
  template_id: string;
  status: "pendiente" | "firmado";
  assigned_by: string | null;
  assigned_at: string;
  signed_at: string | null;
};

/** Firma emitida por la clienta sobre una asignación. */
export type ContractSignature = {
  id: string;
  member_email: string;
  version: number | null;
  template_id: string | null;
  assignment_id: string | null;
  signer_name: string;
  signature_path: string | null;
  signed_pdf_path: string | null;
  field_values: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  signed_at: string;
};

/** Tipo de un campo del formulario dentro de un contrato. */
export type FieldType = "text" | "date" | "tel" | "yesno" | "textarea" | "checkbox" | "radio";

export type FieldOption = {
  value: string;
  label: string;
  /** Texto largo bajo la etiqueta (el literal legal de la opción). */
  detalle?: string;
  /** Se pinta con más peso visual. */
  destacar?: boolean;
};

export type ContractField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: FieldOption[];
  /** Obligatorio SOLO si otro campo tiene un valor concreto. */
  requiredIf?: { key: string; value: string };
};

/**
 * ANEXO II-A — ELECCIÓN SOBRE EL INICIO DEL SERVICIO
 *
 * Es el bloque que faltaba y por el que los contratos firmados hasta ahora no
 * protegen nada: sin la petición expresa de inicio inmediato y sin el
 * reconocimiento de pérdida del derecho, la clienta conserva catorce días para
 * pedir el 100 % del importe.
 *
 * Son DOS consentimientos jurídicamente distintos y van en dos controles
 * separados a propósito. Fundirlos en uno, o meterlos dentro de un «acepto los
 * términos» genérico, los invalida.
 *
 * Nada viene preseleccionado. El TJUE lo dejó claro en Planet49 (C-673/17):
 * una casilla marcada de fábrica no es consentimiento. Tiene que ser un clic.
 */
export const OPCION_INMEDIATO = "inmediato";
export const OPCION_DIFERIDO = "diferido";

/** Días naturales de derecho de desistimiento. */
export const DIAS_DESISTIMIENTO = 14;

export const INICIO_FIELDS: ContractField[] = [
  {
    key: "inicio_servicio",
    label: "¿Cuándo quieres empezar?",
    type: "radio",
    required: true,
    hint: `Tienes ${DIAS_DESISTIMIENTO} días naturales para desistir del contrato sin dar explicaciones. Elige una de las dos opciones.`,
    options: [
      {
        value: OPCION_INMEDIATO,
        label: "Quiero empezar ya",
        detalle:
          "Solicito EXPRESAMENTE que la prestación del servicio y el suministro íntegro de los contenidos digitales y del acceso a la plataforma comiencen de forma inmediata, antes de que finalice el plazo de catorce días.",
        destacar: true,
      },
      {
        value: OPCION_DIFERIDO,
        label: "Prefiero esperar",
        detalle:
          "El servicio comenzará una vez transcurrido el plazo de catorce días naturales, conservando íntegro mi derecho de libre resolución durante dicho plazo.",
      },
    ],
  },
  {
    key: "reconoce_perdida",
    label:
      "RECONOZCO Y ACEPTO que, una vez suministrados los contenidos digitales y habilitado el acceso a la plataforma, PIERDO MI DERECHO DE LIBRE RESOLUCIÓN respecto de ellos; y que, si desisto tras haber comenzado la prestación, deberé abonar el importe proporcional al servicio ya prestado conforme a la ponderación de valor del Anexo III-B.",
    type: "checkbox",
    requiredIf: { key: "inicio_servicio", value: OPCION_INMEDIATO },
  },
];

/**
 * Campos que la clienta rellena según el tipo de plantilla. Fijos a propósito:
 * son los que aparecen en el contrato original (identificación de las partes)
 * y en el anexo de salud (cribado + declaraciones + consentimiento datos).
 */
export const CONTRACT_FIELDS: ContractField[] = [
  { key: "nombre_completo",  label: "Nombre y apellidos",      type: "text",  required: true },
  { key: "dni",              label: "Documento de identidad",  type: "text",  required: true, hint: "DNI, NIE o pasaporte" },
  { key: "domicilio",        label: "Domicilio",               type: "text",  required: true, hint: "Calle, número, piso" },
  { key: "codigo_postal",    label: "Código postal",           type: "text",  required: true },
  { key: "ciudad",           label: "Ciudad",                  type: "text",  required: true },
  { key: "pais",             label: "País de residencia",      type: "text",  required: true },
  { key: "telefono",         label: "Teléfono",                type: "tel",   required: true },
  { key: "fecha_nacimiento", label: "Fecha de nacimiento",     type: "date",  required: true },
];

export const ANEXO_SALUD_FIELDS: ContractField[] = [
  { key: "nombre_completo",     label: "Nombre y apellidos",             type: "text", required: true },
  { key: "fecha_nacimiento",    label: "Fecha de nacimiento",            type: "date", required: true },
  { key: "emergencia_nombre",   label: "Contacto de emergencia (nombre)", type: "text", required: true },
  { key: "emergencia_telefono", label: "Contacto de emergencia (teléfono)", type: "tel", required: true },

  // Cribado de salud (SÍ/NO)
  { key: "cribado_cardio",      label: "¿Afección cardíaca, hipertensión, diabetes o enfermedad respiratoria?", type: "yesno", required: true },
  { key: "cribado_pecho",       label: "¿Dolor en el pecho, palpitaciones o mareos con el esfuerzo?",           type: "yesno", required: true },
  { key: "cribado_lesiones",    label: "¿Lesiones, dolor articular, hernias, cirugías recientes o limitación?", type: "yesno", required: true },
  { key: "cribado_hormonal",    label: "¿Alteración hormonal, tiroidea o ginecológica? ¿Embarazo o lactancia?", type: "yesno", required: true },
  { key: "cribado_tca",         label: "¿Trastorno de conducta alimentaria (actual o pasado)?",                 type: "yesno", required: true },
  { key: "cribado_psico",       label: "¿Tratamiento psicológico/psiquiátrico o psicofármacos?",                type: "yesno", required: true },
  { key: "cribado_medicacion",  label: "¿Medicación o suplementos habituales, incluidos para el peso?",         type: "yesno", required: true },
  { key: "cribado_alergias",    label: "¿Alergias o intolerancias alimentarias?",                               type: "yesno", required: true },
  { key: "cribado_otras",       label: "¿Otra circunstancia de salud relevante para la coach?",                 type: "yesno", required: true },
  { key: "detalle_afirmativas", label: "Detalle de las respuestas afirmativas (obligatorio si has marcado algún SÍ)", type: "textarea" },

  // Declaraciones y consentimiento (todas obligatorias)
  { key: "decl_veracidad", label: "La información facilitada es completa, veraz y exacta; no he omitido nada relevante.", type: "checkbox", required: true },
  { key: "decl_no_medico", label: "Comprendo que el Programa es asesoramiento y educación; NO es acto médico, diagnóstico ni tratamiento, y NO sustituye la consulta de un profesional sanitario.", type: "checkbox", required: true },
  { key: "decl_valoracion", label: "He sido informada de la recomendación de valoración médica previa y asumo libremente la decisión de iniciar el Programa.", type: "checkbox", required: true },
  { key: "decl_cambios",   label: "Me comprometo a comunicar cualquier cambio en mi salud, medicación, embarazo o lesión, y a detener la actividad y acudir a un profesional ante dolor, mareo o síntoma anómalo.", type: "checkbox", required: true },
  { key: "decl_riesgo",    label: "Comprendo que la actividad física conlleva riesgo inherente de lesión que ninguna pauta elimina por completo; lo asumo voluntariamente y soy responsable de la ejecución técnica y del entorno.", type: "checkbox", required: true },
  { key: "consent_salud",  label: "PRESTO MI CONSENTIMIENTO EXPLÍCITO al tratamiento de mis datos de salud (art. 9.2.a RGPD) con la finalidad de elaboración y seguimiento del Programa.", type: "checkbox", required: true },
];

/** Devuelve los campos que corresponden a un tipo de plantilla.
 *
 * La elección de inicio va SOLO en el contrato: el anexo de salud no la lleva,
 * y pedirla dos veces confundiría a la clienta sobre qué está eligiendo.
 */
export function fieldsFor(kind: ContractKind): ContractField[] {
  return kind === "anexo_salud" ? ANEXO_SALUD_FIELDS : [...CONTRACT_FIELDS, ...INICIO_FIELDS];
}

/** ¿Este campo es obligatorio con los valores que hay ahora mismo? */
export function esObligatorio(f: ContractField, values: Record<string, unknown>): boolean {
  if (f.requiredIf) return String(values[f.requiredIf.key] ?? "") === f.requiredIf.value;
  return f.required === true;
}

/**
 * Valida los valores enviados contra el esquema de campos del tipo. Devuelve el
 * primer error encontrado o `null` si todo está bien. Los checkboxes de salud
 * deben estar marcados; los "yesno" aceptan "si"/"no"; el detalle es obligatorio
 * si algún cribado es "si".
 */
export function validateFields(kind: ContractKind, values: Record<string, unknown>): string | null {
  const fields = fieldsFor(kind);
  const anyYes = fields.some((f) => f.type === "yesno" && String(values[f.key] ?? "").toLowerCase() === "si");
  for (const f of fields) {
    const raw = values[f.key];
    // Detalle obligatorio solo si hubo algún SÍ en el cribado
    if (f.key === "detalle_afirmativas") {
      if (anyYes && (typeof raw !== "string" || raw.trim().length < 3)) {
        return "Detalla las respuestas marcadas como SÍ.";
      }
      continue;
    }
    if (!esObligatorio(f, values)) continue;
    if (f.type === "radio") {
      const permitidos = (f.options ?? []).map((o) => o.value);
      if (typeof raw !== "string" || !permitidos.includes(raw)) {
        return "Elige cuándo quieres que empiece el servicio.";
      }
      continue;
    }
    if (f.type === "checkbox") {
      if (raw !== true) return `Falta aceptar: “${f.label}”.`;
      continue;
    }
    if (f.type === "yesno") {
      const v = String(raw ?? "").toLowerCase();
      if (v !== "si" && v !== "no") return `Responde SÍ o NO: “${f.label}”.`;
      continue;
    }
    if (typeof raw !== "string" || raw.trim().length < 2) {
      return `Falta rellenar: “${f.label}”.`;
    }
  }

  // Coherencia del Anexo II-A: el reconocimiento de pérdida del derecho solo
  // tiene sentido con el inicio inmediato. Si llega marcado junto al inicio
  // diferido, el envío no viene de la pantalla: se rechaza en vez de guardar un
  // consentimiento contradictorio que luego no valdría para nada.
  if (kind !== "anexo_salud") {
    const eleccion = String(values.inicio_servicio ?? "");
    if (eleccion === OPCION_DIFERIDO && values.reconoce_perdida === true) {
      return "La declaración de pérdida del derecho solo se aplica si eliges empezar ya.";
    }
  }
  return null;
}
