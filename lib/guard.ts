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
export async function requireMember(opts?: { skipContractGate?: boolean }): Promise<string> {
  const email = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!email) redirect("/miembros/acceso");
  // El redirect debe ir FUERA del try: redirect() funciona lanzando una
  // excepción (NEXT_REDIRECT) que un catch tragaría, anulando el corte.
  const state = await memberState(email);
  if (state.revoked) redirect("/miembros/acceso?revoked=1");
  if (state.needsOnboarding) redirect("/miembros/bienvenida");
  // Si tiene contratos pendientes, la mandamos a firmarlos antes de nada. El
  // opt-out (skipContractGate) es para la propia página de firma, que no puede
  // redirigirse a sí misma.
  if (!opts?.skipContractGate && state.pendingContracts > 0) redirect("/miembros/contrato");
  return email;
}

/**
 * Estado de la clienta en una sola consulta: si sigue activa, si ya pasó por
 * la pantalla de bienvenida (nombre, foto y aceptación de condiciones) y si
 * tiene contratos pendientes que le impidan entrar.
 *
 * EXENCIÓN: las clientas que ya estaban dadas de alta antes de implantar la
 * firma obligatoria llevan `contracts_exempt = true` y nunca quedan bloqueadas,
 * aunque la coach les asigne un contrato (podrán firmarlo, pero de forma
 * voluntaria). El bloqueo solo se aplica a las altas nuevas.
 *
 * Degradación segura: si la consulta falla (Supabase caído) no bloqueamos, para
 * no dejar fuera a nadie por una incidencia puntual. Por el mismo motivo, si la
 * columna `contracts_exempt` todavía no existe se trata como exenta.
 */
export async function memberState(email: string): Promise<{ revoked: boolean; needsOnboarding: boolean; pendingContracts: number; contractsExempt: boolean }> {
  if (isAdmin(email)) return { revoked: false, needsOnboarding: false, pendingContracts: 0, contractsExempt: true };
  try {
    const [profRows, pending] = await Promise.all([
      sbSelect<{ access_revoked: boolean | null; onboarding_completed_at: string | null; contracts_exempt?: boolean | null }>(
        "profiles",
        `select=access_revoked,onboarding_completed_at,contracts_exempt&email=eq.${encodeURIComponent(email)}`
      ).catch(() =>
        // La columna aún no existe (falta la migración): leemos sin ella y
        // tratamos a todo el mundo como exento, para no bloquear a nadie.
        sbSelect<{ access_revoked: boolean | null; onboarding_completed_at: string | null }>(
          "profiles",
          `select=access_revoked,onboarding_completed_at&email=eq.${encodeURIComponent(email)}`
        ).then((rows) => rows.map((r) => ({ ...r, contracts_exempt: true })))
      ),
      sbSelect<{ id: string }>(
        "contract_assignments",
        `select=id&member_email=eq.${encodeURIComponent(email)}&status=eq.pendiente`
      ).catch(() => [] as { id: string }[]),
    ]);
    // Sin fila de perfil no podemos saber si es antigua: no bloqueamos.
    const exempt = profRows.length === 0 || profRows[0]?.contracts_exempt !== false;
    return {
      revoked: profRows[0]?.access_revoked === true,
      needsOnboarding: !profRows[0]?.onboarding_completed_at,
      pendingContracts: exempt ? 0 : pending.length,
      contractsExempt: exempt,
    };
  } catch {
    return { revoked: false, needsOnboarding: false, pendingContracts: 0, contractsExempt: true };
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
