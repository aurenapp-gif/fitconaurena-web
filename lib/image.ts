/**
 * Redimensiona/comprime una imagen en el navegador antes de subirla, para no
 * superar el límite de tamaño de las funciones del servidor (las fotos del
 * móvil suelen pesar varios MB). Baja tamaño/calidad de forma progresiva hasta
 * quedar por debajo del objetivo. Si algo falla, devuelve el archivo original.
 * Solo debe usarse en componentes cliente.
 */
const TARGET = 1_200_000; // ~1.2 MB

function draw(bitmap: ImageBitmap, max: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
}

export async function resizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let best: Blob | null = null;
    for (const [max, q] of [[1600, 0.8], [1280, 0.7], [1024, 0.6], [800, 0.55]] as const) {
      const blob = await draw(bitmap, max, q);
      if (!blob) continue;
      best = blob;
      if (blob.size <= TARGET) break;
    }
    if (!best || best.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([best], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
