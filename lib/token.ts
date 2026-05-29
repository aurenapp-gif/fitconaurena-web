import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless, signed verification tokens for the lead-magnet double opt-in flow.
 *
 * A token carries the lead's email and an expiry, signed with HMAC-SHA256.
 * This avoids needing a database to track pending verifications: the link in
 * the email is self-contained and tamper-proof.
 *
 * Set LEAD_SECRET in the environment for production. A development fallback is
 * used otherwise so the flow works out of the box locally.
 */

const DEV_SECRET = "dev-insecure-lead-secret-change-me";

function getSecret(): string {
  const secret = process.env.LEAD_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // Don't silently sign with a known secret in production.
      throw new Error("LEAD_SECRET environment variable is required in production");
    }
    return DEV_SECRET;
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

/** Default token lifetime: 24 hours. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function createToken(email: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload = JSON.stringify({ email, exp: Date.now() + ttlMs });
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "malformed" | "invalid" | "expired" };

export function verifyToken(token: string): VerifyResult {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "malformed" };
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return { ok: false, reason: "malformed" };
  }

  const expected = sign(encoded);
  // Constant-time comparison to avoid leaking signature info.
  const sigBuf = fromBase64url(signature);
  const expBuf = fromBase64url(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "invalid" };
  }

  let parsed: { email?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(fromBase64url(encoded).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }

  if (Date.now() > parsed.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, email: parsed.email };
}
