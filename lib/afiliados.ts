import { leerAjuste } from "./ajustes";
import { esCorreoDePrueba, isAdmin } from "./members";

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

/** Si está encendido para las clientas. Es el interruptor del Panel. */
export async function afiliadosVisible(): Promise<boolean> {
  return (await leerAjuste(AJUSTE_AFILIADOS))?.trim().toLowerCase() === "si";
}

/**
 * ¿Esta persona ve el apartado de recomendación?
 *
 * Con el interruptor apagado lo ven la coach y sus perfiles de prueba, y
 * nadie más. Hace falta para poder mirar el inicio tal y como va a quedar —la
 * tarjeta, dónde cae, qué tapa— sin prometerle 200 € a veintitantas mujeres.
 * Y no abre nada que no estuviera ya abierto: un alias de su propio correo es
 * ella misma.
 */
export function puedeVerAfiliados(visible: boolean, email: string | null): boolean {
  return visible || isAdmin(email) || esCorreoDePrueba(email);
}

export async function veAfiliados(email: string | null): Promise<boolean> {
  return puedeVerAfiliados(await afiliadosVisible(), email);
}
