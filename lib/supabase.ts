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

/** Genera una URL firmada temporal para descargar un objeto privado. */
export async function sbSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const res = await fetchT(`${URL_BASE}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`sbSignedUrl ${bucket}/${path}: ${res.status}`);
  const { signedURL } = await res.json();
  return `${URL_BASE}/storage/v1${signedURL}`;
}

/** Nombre de archivo seguro para usar como ruta en Storage. */
export function safePath(name: string): string {
  const clean = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
}
