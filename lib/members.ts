import { createHmac, timingSafeEqual } from "crypto";

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

export const createMagicToken = (email: string) =>
  createToken({ email, typ: "magic", exp: Date.now() + MAGIC_TTL });
export const verifyMagicToken = (token?: string) => verify(token, "magic");

export const createSessionToken = (email: string) =>
  createToken({ email, typ: "session", exp: Date.now() + SESSION_TTL });
export const verifySession = (token?: string) => verify(token, "session");

/** ¿Es el email un administrador (la coach)? Lista en ADMIN_EMAILS. */
export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** ¿El email pertenece al grupo "Miembros" y está activo en MailerLite? */
export async function isMember(email: string): Promise<boolean> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_MEMBERS_GROUP_ID;
  if (!apiKey || !groupId) return false;
  try {
    const res = await fetch(
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
