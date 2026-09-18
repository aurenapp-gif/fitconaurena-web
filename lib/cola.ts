/**
 * Escrituras en fila india.
 *
 * Apuntando una serie salen dos guardados casi seguidos: al salir del peso se
 * guarda con las repeticiones todavía vacías, y al salir de las repeticiones
 * se guarda entero. Son dos peticiones distintas y nada garantiza que lleguen
 * en ese orden: si la primera llega la última, machaca las repeticiones y la
 * serie se queda en «62,5 kg × ?».
 *
 * Con esto, la segunda espera a la primera. Una fila por clave —por serie—,
 * para que un envío atascado no frene a los demás.
 */
export function enCola<T>(
  colas: Map<string, Promise<unknown>>,
  clave: string,
  tarea: () => Promise<T>
): Promise<T> {
  const anterior = colas.get(clave) ?? Promise.resolve();
  // Se encadena pase lo que pase con la anterior: que una falle no puede
  // dejar la fila parada para siempre.
  const mia = anterior.then(tarea, tarea);
  colas.set(clave, mia.then(() => undefined, () => undefined));
  return mia;
}
