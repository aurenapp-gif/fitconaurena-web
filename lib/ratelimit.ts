/**
 * Limitador de tasa en memoria (ventana deslizante), best-effort.
 *
 * NOTA: en serverless cada instancia tiene su propia memoria, así que esto
 * frena ráfagas sobre una misma instancia caliente y abuso casual, pero no es
 * un límite global estricto. Para protección dura ante abuso real, migrar a un
 * almacén compartido (Vercel KV / Upstash Redis).
 */

type Bucket = number[]; // timestamps (ms)
const store = new Map<string, Bucket>();

// Limpieza perezosa para no crecer indefinidamente.
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  const toDelete: string[] = [];
  store.forEach((hits, key) => {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length) store.set(key, fresh);
    else toDelete.push(key);
  });
  toDelete.forEach((key) => store.delete(key));
}

/**
 * Devuelve true si la petición está permitida; false si supera el límite.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    store.set(key, hits);
    return false;
  }
  hits.push(now);
  store.set(key, hits);
  return true;
}
