import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";

/**
 * Gate de las páginas de miembro: valida la sesión y comprueba que la clienta
 * no haya sido revocada (corte inmediato al eliminarla). Devuelve el email o
 * redirige. Como las páginas son dinámicas, la comprobación es efectiva en la
 * siguiente navegación.
 */
export async function requireMember(): Promise<string> {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  if (!isAdmin(email)) {
    try {
      const rows = await sbSelect<{ access_revoked: boolean | null }>(
        "profiles",
        `select=access_revoked&email=eq.${encodeURIComponent(email)}`
      );
      if (rows[0]?.access_revoked) redirect("/miembros/acceso?revoked=1");
    } catch {
      /* si falla la comprobación, no bloqueamos (degradación segura) */
    }
  }
  return email;
}
