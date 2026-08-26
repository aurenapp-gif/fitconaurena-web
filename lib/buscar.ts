/**
 * Búsqueda de texto tolerante, para filtrar listados en pantalla.
 *
 * Vive aparte del componente para poder probarla sin montar React: es lógica
 * con casos peliagudos (acentos, mayúsculas, varias palabras) y conviene
 * tenerla cubierta.
 */

/** Quita acentos y mayúsculas: buscar «begona» encuentra a «Begoña». */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * ¿Coincide `consulta` con alguno de los campos?
 *
 * Cada palabra de la consulta se busca por separado y todas deben aparecer, así
 * «bego mar» encuentra a «Begoña Martínez» aunque el orden no sea el mismo.
 * Consulta vacía coincide con todo.
 */
export function coincide(consulta: string, ...campos: (string | null | undefined)[]): boolean {
  const q = normalizar(consulta.trim());
  if (!q) return true;
  const heno = normalizar(campos.filter(Boolean).join(" "));
  return q.split(/\s+/).every((parte) => heno.includes(parte));
}
