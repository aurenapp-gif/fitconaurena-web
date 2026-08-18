import { createHmac } from "crypto";

/**
 * Identificador de voto del buzón de dudas: HMAC del correo con el secreto del
 * servidor.
 *
 * Permite impedir que la misma persona vote dos veces la misma duda sin llegar
 * a guardar quién es: del hash no se vuelve al correo. El secreto es el mismo
 * que firma las sesiones y nunca sale del servidor.
 *
 * Vive en su propio módulo (y no junto a los tipos, en lib/dudas.ts) porque de
 * ese sí tiran los componentes de navegador: si estuviera ahí, `crypto` se
 * empaquetaría en el bundle del cliente.
 */
export function voterHash(email: string): string {
  const secret = process.env.MEMBERS_SECRET || "dev-insecure-members-secret";
  return createHmac("sha256", secret).update(`duda-voto:${email.trim().toLowerCase()}`).digest("hex");
}
