/**
 * El correo de bienvenida de verdad, cuando ya no le queda nada por hacer.
 *
 * El del alta es logística: «aquí tienes tu enlace». Este llega cuando ha
 * terminado el papeleo y entra a su área por primera vez de verdad. Para la
 * mayoría eso es al firmar el último contrato —la bienvenida va antes que la
 * firma en el recorrido—; para una clienta sin contrato asignado, al terminar
 * la pantalla de bienvenida. Por eso se llama desde los dos sitios y decide
 * aquí, en un único lugar, si toca o no.
 *
 * Nunca lanza: un correo no puede tumbar una firma.
 */

import { isAdmin, adminEmails } from "@/lib/members";
import { sbSelect } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { sendBienvenidaFirmada } from "@/lib/mailer";

export async function bienvenidaSiProcede(email: string): Promise<void> {
  try {
    if (isAdmin(email)) return;

    const [pendientes, perfil, yaMandada] = await Promise.all([
      sbSelect<{ id: string }>(
        "contract_assignments",
        `select=id&member_email=eq.${encodeURIComponent(email)}&status=eq.pendiente&limit=1`
      ).catch(() => [] as { id: string }[]),
      sbSelect<{ display_name: string | null; onboarding_completed_at: string | null }>(
        "profiles",
        `select=display_name,onboarding_completed_at&email=eq.${encodeURIComponent(email)}&limit=1`
      ).catch(() => []),
      // La marca de que ya se mandó. Si la tabla no existiera, se trata como
      // no mandada: el momento en que se dispara ya ocurre una sola vez.
      sbSelect<{ id: string }>(
        "activity_log",
        `select=id&member_email=eq.${encodeURIComponent(email)}&action=eq.bienvenida&limit=1`
      ).catch(() => [] as { id: string }[]),
    ]);

    // Todavía le queda algo por firmar: la bienvenida es para cuando ya está
    // todo hecho, no a mitad.
    if (pendientes.length > 0) return;
    // Aún no ha pasado por la pantalla de bienvenida (nombre y foto).
    if (!perfil[0]?.onboarding_completed_at) return;
    if (yaMandada.length > 0) return;

    const coachFila = await sbSelect<{ display_name: string | null }>(
      "profiles", `select=display_name&email=eq.${encodeURIComponent(adminEmails()[0] ?? "")}&limit=1`
    ).catch(() => []);

    await sendBienvenidaFirmada(email, {
      nombre: perfil[0]?.display_name ?? null,
      coach: coachFila[0]?.display_name?.trim() || "tu coach",
    });
    await logActivity(email, "bienvenida");
  } catch (e) {
    console.error("[bienvenida] no se pudo mandar", e);
  }
}
