import { leerAjuste } from "./ajustes";
import { adminEmails, isAdmin } from "./members";

/**
 * El programa de recomendación.
 *
 * Un solo número y en un solo sitio: sale en la pantalla de la clienta, en el
 * inicio y en el correo que algún día se mande. Si mañana son 250 €, se cambia
 * aquí y cambia en todas partes; con el número escrito a mano en tres sitios,
 * siempre queda uno antiguo y acabas discutiendo con una clienta por 50 €.
 */
export const COMISION_EUROS = 200;

/**
 * Si las clientas ven el apartado de recomendación.
 *
 * Apagado hasta que la coach dé el visto bueno. Un programa de recomendación
 * no se puede «probar a ver qué tal»: en cuanto una clienta lo lee, es una
 * promesa de 200 € que ya no se puede retirar sin quedar mal. Mientras está
 * apagado, la coach SÍ lo ve, para poder mirarlo como lo verán ellas.
 */
export const AJUSTE_AFILIADOS = "afiliados_visible";

/**
 * Tres estados, no dos:
 *
 *  · «no» (lo que hay por defecto): no existe para nadie.
 *  · «prueba»: lo ven la coach y sus perfiles de prueba, y NADIE más. Es la
 *    única forma de mirar el inicio tal y como va a quedar —la tarjeta, dónde
 *    cae, qué tapa— sin prometerle 200 € a veintitantas mujeres.
 *  · «si»: lo ven todas.
 */
export type EstadoAfiliados = "no" | "prueba" | "si";

export async function estadoAfiliados(): Promise<EstadoAfiliados> {
  const v = (await leerAjuste(AJUSTE_AFILIADOS))?.trim().toLowerCase();
  return v === "si" ? "si" : v === "prueba" ? "prueba" : "no";
}

/** Si está encendido para todas. Es lo que enseña el interruptor del Panel. */
export async function afiliadosVisible(): Promise<boolean> {
  return (await estadoAfiliados()) === "si";
}

/**
 * ¿Es un perfil de prueba de la coach?
 *
 * `aurenapp+loquesea@gmail.com` llega al mismo buzón que `aurenapp@gmail.com`:
 * así se dan de alta las clientas de prueba. Se compara contra ADMIN_EMAILS,
 * o sea que solo valen los alias de su propio correo; el `+` de otra persona
 * no abre nada.
 */
export function esPerfilDePrueba(email: string | null, jefes: string[]): boolean {
  if (!email) return false;
  const [local, dominio] = email.trim().toLowerCase().split("@");
  if (!local || !dominio || !local.includes("+")) return false;
  return jefes.includes(`${local.slice(0, local.indexOf("+"))}@${dominio}`);
}

/**
 * ¿Esta persona ve el apartado de recomendación?
 *
 * La coach lo ve siempre, esté como esté el interruptor: es suyo y tiene que
 * poder mirarlo. Las clientas, solo con «si». Y los perfiles de prueba de la
 * coach, también con «prueba», que es para lo que está.
 */
export function puedeVerAfiliados(estado: EstadoAfiliados, email: string | null): boolean {
  if (estado === "si") return true;
  if (isAdmin(email)) return true;
  return estado === "prueba" && esPerfilDePrueba(email, adminEmails());
}

export async function veAfiliados(email: string | null): Promise<boolean> {
  return puedeVerAfiliados(await estadoAfiliados(), email);
}
