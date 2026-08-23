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
  // Eligió esperar los catorce días: todavía no hay servicio que prestar.
  if (enEspera(state.accessFrom)) redirect(`/miembros/espera?hasta=${state.accessFrom}`);
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
export async function memberState(email: string): Promise<{ revoked: boolean; needsOnboarding: boolean; pendingContracts: number; contractsExempt: boolean; accessFrom: string | null }> {
  if (isAdmin(email)) return { revoked: false, needsOnboarding: false, pendingContracts: 0, contractsExempt: true, accessFrom: null };
  try {
    const [profRows, pending] = await Promise.all([
      sbSelect<{ access_revoked: boolean | null; onboarding_completed_at: string | null; contracts_exempt?: boolean | null; access_from?: string | null }>(
        "profiles",
        `select=access_revoked,onboarding_completed_at,contracts_exempt,access_from&email=eq.${encodeURIComponent(email)}`
      ).catch(() =>
        // Alguna columna aún no existe (falta la migración): leemos sin ellas y
        // tratamos a todo el mundo como exento, para no bloquear a nadie.
        sbSelect<{ access_revoked: boolean | null; onboarding_completed_at: string | null }>(
          "profiles",
          `select=access_revoked,onboarding_completed_at&email=eq.${encodeURIComponent(email)}`
        ).then((rows) => rows.map((r) => ({ ...r, contracts_exempt: true, access_from: null })))
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
      accessFrom: profRows[0]?.access_from ?? null,
    };
  } catch {
    return { revoked: false, needsOnboarding: false, pendingContracts: 0, contractsExempt: true, accessFrom: null };
  }
}

/**
 * ¿Todavía está en el plazo de espera que ella misma eligió?
 *
 * Si en el Anexo II-A marcó «prefiero esperar», el servicio NO empieza hasta que
 * pasen los catorce días: ni plataforma, ni contenidos, ni llamada. Darle acceso
 * antes sería entregarle contenido digital sin que lo haya pedido, y entonces
 * conserva el derecho a que se le devuelva el 100 %.
 *
 * Se compara por DÍA en horario de Madrid: con UTC, entre las 00:00 y las 02:00
 * el servidor creería que aún es el día anterior y la dejaría fuera una noche
 * de más.
 */
export function enEspera(accessFrom: string | null | undefined): boolean {
  if (!accessFrom) return false;
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  return hoy < accessFrom;
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
