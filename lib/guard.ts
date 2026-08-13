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
  // El redirect debe ir FUERA del try: redirect() funciona lanzando una
  // excepción (NEXT_REDIRECT) que un catch tragaría, anulando el corte.
  const state = await memberState(email);
  if (state.revoked) redirect("/miembros/acceso?revoked=1");
  if (state.needsOnboarding) redirect("/miembros/bienvenida");
  return email;
}

/**
 * Estado de la clienta en una sola consulta: si sigue activa y si ya pasó por
 * la pantalla de bienvenida (nombre, foto y aceptación de condiciones).
 *
 * Degradación segura: si la consulta falla (Supabase caído) no bloqueamos, para
 * no dejar fuera a nadie por una incidencia puntual.
 */
export async function memberState(email: string): Promise<{ revoked: boolean; needsOnboarding: boolean }> {
  if (isAdmin(email)) return { revoked: false, needsOnboarding: false };
  try {
    const rows = await sbSelect<{ access_revoked: boolean | null; onboarding_completed_at: string | null }>(
      "profiles",
      `select=access_revoked,onboarding_completed_at&email=eq.${encodeURIComponent(email)}`
    );
    return {
      revoked: rows[0]?.access_revoked === true,
      needsOnboarding: !rows[0]?.onboarding_completed_at,
    };
  } catch {
    return { revoked: false, needsOnboarding: false };
  }
}

/**
 * ¿Se le ha revocado el acceso a esta clienta? (corte inmediato al eliminarla).
 * Útil tanto en páginas como en route handlers de escritura, para que una
 * clienta eliminada no pueda seguir operando aunque conserve la cookie.
 * La coach (admin) nunca está revocada. Degradación segura: si la comprobación
 * falla (Supabase caído), devolvemos false y no bloqueamos.
 */
export async function isAccessRevoked(email: string): Promise<boolean> {
  if (isAdmin(email)) return false;
  try {
    const rows = await sbSelect<{ access_revoked: boolean | null }>(
      "profiles",
      `select=access_revoked&email=eq.${encodeURIComponent(email)}`
    );
    return rows[0]?.access_revoked === true;
  } catch {
    return false;
  }
}
