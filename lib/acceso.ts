/**
 * Quién puede pedir un código para entrar.
 *
 * Hasta ahora lo decidía MailerLite: solo se mandaba el código si el correo
 * estaba en el grupo «Miembros» Y con estado «activo». Eso mete una herramienta
 * de correo en medio de la puerta de casa, y tiene una consecuencia que nadie
 * ve venir: el día que una clienta pulsa «darse de baja» en cualquier correo
 * del programa, MailerLite la pasa a «unsubscribed» y deja de poder entrar en
 * lo que ha pagado. No hay aviso, no hay error: el formulario dice «te hemos
 * mandado el código» y el código no sale nunca.
 *
 * Así que la puerta la decide nuestra base, que es donde vive la verdad: tiene
 * ficha y no se le ha retirado el acceso. `access_revoked` es lo que pone
 * «Eliminar» desde el panel y lo mismo que mira el guard en cada página, así
 * que dar de baja a una clienta le sigue cerrando la puerta en el acto.
 *
 * No abre la mano con desconocidos: una fila de `profiles` solo la crea el
 * alta desde el panel, la propia clienta ya con sesión, o una entrada con un
 * enlace firmado. Nada de eso se puede hacer desde fuera.
 */

import { isAdmin, isMember } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";

/** ¿Tiene ficha y sin el acceso retirado? */
async function tieneFichaActiva(email: string): Promise<boolean> {
  try {
    const filas = await sbSelect<{ access_revoked: boolean | null }>(
      "profiles",
      `select=access_revoked&email=eq.${encodeURIComponent(email)}&limit=1`
    );
    return filas.length > 0 && filas[0].access_revoked !== true;
  } catch {
    // Si la base no contesta no se inventa un permiso: manda MailerLite.
    return false;
  }
}

/**
 * ¿A este correo se le puede mandar un código de acceso?
 *
 * Basta con una de las dos: estar activa en MailerLite (como siempre) o tener
 * ficha con acceso. La coach nunca se queda fuera.
 */
export async function puedeRecibirCodigo(email: string): Promise<boolean> {
  if (isAdmin(email)) return true;
  if (await tieneFichaActiva(email)) return true;
  return isMember(email);
}
