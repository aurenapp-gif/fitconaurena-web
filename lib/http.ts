/** fetch con timeout: si un servicio externo (Resend, MailerLite…) no responde,
 * aborta en vez de colgar la petición. Mismo patrón que lib/supabase.ts. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
