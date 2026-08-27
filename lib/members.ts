import { createHmac, timingSafeEqual } from "crypto";
import { fetchWithTimeout } from "@/lib/http";

/**
 * Área de miembros: magic-link login + sesión por cookie firmada (HMAC).
 *
 * - Registro de miembros: grupo "Miembros" en MailerLite (alta manual).
 * - Sin contraseñas ni base de datos: el enlace mágico y la sesión son tokens
 *   firmados y autocontenidos.
 *
 * Variables: MEMBERS_SECRET, MAILERLITE_API_KEY, MAILERLITE_MEMBERS_GROUP_ID.
 */

const DEV_SECRET = "dev-insecure-members-secret";

function getSecret(): string {
  const s = process.env.MEMBERS_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MEMBERS_SECRET requerido en producción");
    }
    return DEV_SECRET;
  }
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

type Payload = { email: string; typ: "magic" | "session"; exp: number };

function createToken(p: Payload): string {
  const enc = b64url(JSON.stringify(p));
  return `${enc}.${sign(enc)}`;
}

function verify(token: string | undefined, typ: Payload["typ"]): string | null {
  if (!token || !token.includes(".")) return null;
  const [enc, sig] = token.split(".");
  if (!enc || !sig) return null;
  const expected = sign(enc);
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let p: Payload;
  try {
    p = JSON.parse(fromB64url(enc).toString("utf8"));
  } catch {
    return null;
  }
  if (p.typ !== typ || typeof p.email !== "string" || typeof p.exp !== "number") return null;
  if (Date.now() > p.exp) return null;
  return p.email;
}

const MAGIC_TTL = 15 * 60 * 1000; // 15 min
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

export const SESSION_COOKIE = "fca_member";
export const SESSION_MAX_AGE = SESSION_TTL / 1000;

export const createMagicToken = (email: string, ttlMs: number = MAGIC_TTL) =>
  createToken({ email, typ: "magic", exp: Date.now() + ttlMs });
export const verifyMagicToken = (token?: string) => verify(token, "magic");

export const createSessionToken = (email: string) =>
  createToken({ email, typ: "session", exp: Date.now() + SESSION_TTL });
export const verifySession = (token?: string) => verify(token, "session");

/** Lista de emails administradores (la coach). Configurable en ADMIN_EMAILS. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** ¿Es el email un administrador (la coach)? Lista en ADMIN_EMAILS. */
export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * Lista las clientas (suscriptoras del grupo "Miembros").
 *
 * PAGINADO. Antes se pedía una sola página de 200 y ahí se acababa: la clienta
 * 201 simplemente dejaba de existir para la app —no salía en el panel, no
 * recibía recordatorios— y sin ningún error que lo delatara. Era un techo
 * invisible esperando a que el negocio creciera.
 *
 * El tope de páginas es una red de seguridad contra un bucle infinito si la API
 * devolviera siempre un cursor: 25 páginas son 2.500 clientas, muy por encima
 * de cualquier escenario real, y si algún día se alcanzara conviene enterarse.
 */
export async function getMembers(): Promise<{ email: string; name: string }[]> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return [];

  const MAX_PAGINAS = 25;
  const salida: { email: string; name: string }[] = [];
  let cursor: string | null = null;

  try {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const qs = `limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res: Response = await fetchWithTimeout(
        `https://connect.mailerlite.com/api/groups/${groupId}/subscribers?${qs}`,
        { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }, cache: "no-store" }
      );
      // Si falla a media paginación se devuelve lo ya reunido: media lista es
      // mejor que ninguna, y quedarse sin nadie rompería el panel entero.
      if (!res.ok) break;
      const data = await res.json();
      const lote: { email: string; fields?: { name?: string } }[] = data?.data ?? [];
      for (const s of lote) {
        salida.push({ email: s.email, name: s.fields?.name || s.email.split("@")[0] });
      }
      cursor = data?.meta?.next_cursor ?? null;
      if (!cursor || lote.length === 0) break;
      if (pagina === MAX_PAGINAS - 1) {
        console.error(`[members] ${MAX_PAGINAS} páginas y sigue habiendo cursor: revisar la paginación`);
      }
    }
  } catch {
    // Se devuelve lo que se haya podido reunir.
  }
  return salida;
}

/** ¿El email pertenece al grupo "Miembros" y está activo en MailerLite? */
export async function isMember(email: string): Promise<boolean> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return false;
  try {
    const res = await fetchWithTimeout(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const sub = data?.data;
    if (!sub || sub.status !== "active") return false;
    return (sub.groups ?? []).some((g: { id: string }) => g.id === groupId);
  } catch {
    return false;
  }
}
