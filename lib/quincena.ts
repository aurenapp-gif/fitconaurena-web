/**
 * Lo que ella misma contesta de su quincena, en casillas.
 *
 * No sustituye a lo que apunta cada día: lo completa. Hay clientas que no
 * apuntan a diario y de las que, por tanto, no sabemos nada —en octubre, la
 * mitad no llegaba a diez días de registro al mes—, pero sí son capaces de
 * decir «de media unos 8.000 pasos» cuando se les pregunta en la revisión.
 * Un dato aproximado que existe vale más que uno exacto que no está.
 *
 * Todas son de respuesta única y ninguna es obligatoria. Se guardan como
 * números para poder compararlas entre quincenas sin interpretar texto.
 */

export type Opcion = { valor: number; texto: string };

export type CampoQuincena = {
  /** Columna en `check_ins`. */
  id: "pasos_media" | "agua_media" | "dias_entreno" | "cumplimiento" | "comidas_fuera";
  label: string;
  /** La aclaración de debajo, cuando hace falta. */
  pista?: string;
  opciones: Opcion[];
};

export const CAMPOS_QUINCENA: CampoQuincena[] = [
  {
    id: "pasos_media",
    label: "Pasos de estos 15 días",
    pista: "De media al día, a ojo. Lo que marque tu móvil o tu reloj.",
    opciones: [
      { valor: 5000, texto: "5.000" },
      { valor: 6000, texto: "6.000" },
      { valor: 7000, texto: "7.000" },
      { valor: 8000, texto: "8.000" },
      { valor: 9000, texto: "9.000 o más" },
    ],
  },
  {
    id: "agua_media",
    // En décimas de litro: 15 son 1,5 L. Enteros para no pelearse con los
    // decimales en la base ni con la coma en el móvil.
    label: "Agua al día",
    pista: "De media estos 15 días.",
    opciones: [
      { valor: 10, texto: "1 L" },
      { valor: 15, texto: "1,5 L" },
      { valor: 20, texto: "2 L" },
      { valor: 25, texto: "2,5 L" },
      { valor: 30, texto: "3 L" },
      { valor: 35, texto: "Más de 3 L" },
    ],
  },
  {
    id: "dias_entreno",
    label: "Días entrenados por semana",
    pista: "De media estas dos semanas.",
    opciones: [
      { valor: 2, texto: "2" },
      { valor: 3, texto: "3" },
      { valor: 4, texto: "4" },
      { valor: 5, texto: "Más de 4" },
    ],
  },
  {
    id: "cumplimiento",
    label: "Cuánto has cumplido tu plan de alimentación",
    pista: "Sin maquillarlo: con la verdad se ajusta el plan; con un 100 % de adorno, no.",
    opciones: [
      { valor: 50, texto: "50 %" },
      { valor: 60, texto: "60 %" },
      { valor: 70, texto: "70 %" },
      { valor: 80, texto: "80 %" },
      { valor: 90, texto: "90 %" },
      { valor: 100, texto: "100 %" },
    ],
  },
  {
    id: "comidas_fuera",
    label: "Comidas fuera de casa por semana",
    opciones: [
      { valor: 0, texto: "Ninguna" },
      { valor: 1, texto: "1" },
      { valor: 2, texto: "2" },
      { valor: 3, texto: "3 o más" },
    ],
  },
];

/** El valor que llega del navegador, o null si no es una opción de verdad. */
export function valorValido(id: string, bruto: unknown): number | null {
  const campo = CAMPOS_QUINCENA.find((c) => c.id === id);
  if (!campo) return null;
  const n = Number(String(bruto ?? "").trim());
  if (!Number.isInteger(n)) return null;
  return campo.opciones.some((o) => o.valor === n) ? n : null;
}

/** Cómo se lee cada respuesta: «8.000 pasos», «2 L», «4 días». */
export function textoDe(id: CampoQuincena["id"], valor: number | null | undefined): string | null {
  if (valor == null) return null;
  const campo = CAMPOS_QUINCENA.find((c) => c.id === id);
  const op = campo?.opciones.find((o) => o.valor === valor);
  if (!op) return null;
  switch (id) {
    case "pasos_media": return `${op.texto} pasos`;
    case "agua_media": return op.texto;
    case "dias_entreno": return `${op.texto} días/sem`;
    case "cumplimiento": return `plan ${op.texto}`;
    case "comidas_fuera": return op.valor === 0 ? "sin comidas fuera" : `${op.texto} fuera/sem`;
  }
}

/** Todo lo contestado, en una línea para la coach. */
export function resumenQuincena(fila: Partial<Record<CampoQuincena["id"], number | null>>): string {
  return CAMPOS_QUINCENA.map((c) => textoDe(c.id, fila[c.id])).filter(Boolean).join(" · ");
}
