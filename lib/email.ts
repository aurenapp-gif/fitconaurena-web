/** Shared email helpers: validation + normalization. */

// Pragmatic email check — good enough to reject obvious garbage without
// rejecting valid-but-unusual addresses. Real validation happens at delivery.
// Excluye además caracteres especiales de PostgREST (, ( ) ' " ;) como defensa
// en profundidad frente a inyección en filtros, aunque siempre se codifican.
const EMAIL_RE = /^[^\s@,()'";]+@[^\s@,()'";]+\.[^\s@,()'";]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}
