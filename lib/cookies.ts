/**
 * Nombres de las cookies, y nada más.
 *
 * Sin un solo import a propósito: de aquí tira el `middleware`, que corre en
 * el Edge. Si tirara de `lib/members`, se llevaría `crypto` y medio servidor
 * dentro de algo que se ejecuta en CADA petición al área de miembros.
 */
export const SESSION_COOKIE = "fca_member";
export const VISTA_COOKIE = "fca_ver_como";
