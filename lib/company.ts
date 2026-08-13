/**
 * Datos identificativos de la empresa que presta el servicio.
 * Fuente única: los avisos legales (privacidad, términos, cookies) y los
 * emails legales se apoyan en estas constantes.
 */
export const COMPANY = {
  name: "Vento Cogitativo Unipessoal Lda.",
  address: "Avenida Gomes Pereira, 105",
  city: "Lisboa",
  postalCode: "1500-328",
  country: "Portugal",
  nipc: "519216121",
  email: "aurenapp@gmail.com",
  brand: "Programa FITCON",
} as const;

/** Dirección completa en una línea, para pies de página y avisos. */
export function companyAddress(): string {
  const parts = [COMPANY.address, [COMPANY.postalCode, COMPANY.city].filter(Boolean).join(" "), COMPANY.country];
  return parts.filter(Boolean).join(", ");
}

/** Identificación resumida ("Nombre, dirección · NIPC X"). */
export function companyLine(): string {
  const nipc = COMPANY.nipc ? ` · NIPC ${COMPANY.nipc}` : "";
  return `${COMPANY.name}, ${companyAddress()}${nipc}`;
}
