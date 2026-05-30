/**
 * Acceso a Supabase desde el servidor (PostgREST + Storage) usando la clave
 * secreta. SOLO debe importarse en código de servidor (route handlers / server
 * components), nunca en componentes cliente.
 */

const URL_BASE = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;

function headers(extra: Record<string, string> = {}) {
  if (!URL_BASE || !SECRET) throw new Error("Supabase no configurado");
  return { apikey: SECRET, Authorization: `Bearer ${SECRET}`, ...extra };
}

/** fetch con timeout: si Supabase no responde, aborta en vez de colgarse. */
async function fetchT(url: string, init: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** SELECT vía PostgREST. `query` es la query string (filtros, select, order). */
export async function sbSelect<T = unknown>(table: string, query = ""): Promise<T[]> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sbSelect ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** INSERT y devuelve la fila creada. */
export async function sbInsert<T = unknown>(table: string, row: object): Promise<T> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`sbInsert ${table}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

/**
 * INSERT que ignora duplicados (ON CONFLICT DO NOTHING). Útil cuando hay una
 * restricción UNIQUE y dos peticiones simultáneas podrían chocar: en vez de un
 * error 409, no hace nada. No devuelve fila.
 */
export async function sbInsertIgnore(table: string, row: object): Promise<void> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`sbInsertIgnore ${table}: ${res.status} ${await res.text()}`);
}

/** UPSERT (insert o update si choca la PK). */
export async function sbUpsert(table: string, row: object): Promise<void> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`sbUpsert ${table}: ${res.status} ${await res.text()}`);
}

/** UPDATE con filtro PostgREST (ej: `id=eq.${id}`). */
export async function sbUpdate(table: string, filter: string, patch: object): Promise<void> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`sbUpdate ${table}: ${res.status} ${await res.text()}`);
}

/** Sube un archivo a un bucket. `data` son los bytes. */
export async function sbUpload(
  bucket: string,
  path: string,
  data: ArrayBuffer,
  contentType: string
): Promise<void> {
  const res = await fetchT(`${URL_BASE}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": contentType, "x-upsert": "true" }),
    body: new Uint8Array(data),
  });
  if (!res.ok) throw new Error(`sbUpload ${bucket}/${path}: ${res.status} ${await res.text()}`);
}

/** DELETE de filas con filtro PostgREST (ej: `id=eq.${id}`). */
export async function sbDelete(table: string, filter: string): Promise<void> {
  const res = await fetchT(`${URL_BASE}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`sbDelete ${table}: ${res.status} ${await res.text()}`);
}

/** Borra un objeto de un bucket (no lanza si falla). */
export async function sbDeleteObject(bucket: string, path: string): Promise<void> {
  try {
    await fetchT(`${URL_BASE}/storage/v1/object/${bucket}/${path}`, { method: "DELETE", headers: headers() });
  } catch (e) {
    console.error("sbDeleteObject", e);
  }
}

/**
 * Caché en memoria de URLs firmadas (por instancia). La firma de un mismo
 * objeto es reutilizable durante su validez, así que evitamos volver a firmar
 * el mismo path en cada render (force-dynamic) o entre fotos repetidas.
 */
const urlCache = new Map<string, { url: string; exp: number }>();
function cacheGet(key: string): string | undefined {
  const e = urlCache.get(key);
  if (e && e.exp > Date.now()) return e.url;
  if (e) urlCache.delete(key);
  return undefined;
}
function cacheSet(key: string, url: string, expiresIn: number) {
  if (urlCache.size > 3000) urlCache.clear(); // tope defensivo
  // Reutilizamos hasta 5 min antes de caducar la firma.
  urlCache.set(key, { url, exp: Date.now() + Math.max(0, expiresIn * 1000 - 300000) });
}

/** Genera una URL firmada temporal para descargar un objeto privado (con caché). */
export async function sbSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const key = `u:${bucket}:${path}:${expiresIn}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await fetchT(`${URL_BASE}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`sbSignedUrl ${bucket}/${path}: ${res.status}`);
  const { signedURL } = await res.json();
  const url = `${URL_BASE}/storage/v1${signedURL}`;
  cacheSet(key, url, expiresIn);
  return url;
}

/**
 * URL firmada de una MINIATURA (transformación de imagen de Supabase). Reduce
 * mucho el peso en las listas. Si la transformación no está disponible en el
 * plan, lanza y el llamador debe caer a `sbSignedUrl` (imagen completa).
 */
export async function sbSignedThumb(bucket: string, path: string, width = 500, expiresIn = 3600): Promise<string> {
  const key = `t:${bucket}:${path}:${width}:${expiresIn}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await fetchT(`${URL_BASE}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn, transform: { width, height: width, resize: "cover", quality: 70 } }),
  });
  if (!res.ok) throw new Error(`sbSignedThumb ${bucket}/${path}: ${res.status}`);
  const { signedURL } = await res.json();
  const url = `${URL_BASE}/storage/v1${signedURL}`;
  cacheSet(key, url, expiresIn);
  return url;
}

/** Nombre de archivo seguro para usar como ruta en Storage. */
export function safePath(name: string): string {
  const clean = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
}
