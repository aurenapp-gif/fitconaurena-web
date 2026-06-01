import fs from "fs";
import path from "path";

/** Una foto de caso de éxito con sus dimensiones reales (para reservar espacio). */
export type Caso = { src: string; w: number; h: number };

/** Descubre automáticamente las fotos de public/casos-exito (sin tocar código).
 * Las dimensiones salen de manifest.json (generado al optimizar). Si falta una,
 * usa un tamaño por defecto. SOLO servidor (usa fs). */
export function getCasosExito(): Caso[] {
  try {
    const dir = path.join(process.cwd(), "public", "casos-exito");
    let manifest: Record<string, [number, number]> = {};
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    } catch {
      /* sin manifiesto: usamos tamaño por defecto */
    }
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f))
      .sort()
      .map((f) => {
        const dim = manifest[f];
        // Codificamos el nombre (espacios, acentos…) para que la URL sea válida.
        return { src: `/casos-exito/${encodeURIComponent(f)}`, w: dim?.[0] ?? 800, h: dim?.[1] ?? 800 };
      });
  } catch {
    return [];
  }
}
