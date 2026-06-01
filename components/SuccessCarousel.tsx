"use client";

/* Carrusel de casos de éxito: dos columnas verticales que rotan en bucle
 * infinito y en sentidos opuestos. Decorativo (no clicable). Si no hay
 * imágenes, no renderiza nada. Las fotos se descubren solas desde
 * public/casos-exito (ver app/aplicar/page.tsx). */

function Column({ images, dir, seconds }: { images: string[]; dir: "up" | "down"; seconds: number }) {
  const loop = [...images, ...images]; // duplicado para un bucle sin saltos
  return (
    <div className="overflow-hidden h-full">
      <div
        className="flex flex-col gap-4"
        style={{ animation: `${dir === "up" ? "marqueeUp" : "marqueeDown"} ${seconds}s linear infinite` }}
      >
        {loop.map((src, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl border border-[#252525] object-cover"
          />
        ))}
      </div>
    </div>
  );
}

export default function SuccessCarousel({ images }: { images: string[] }) {
  if (!images.length) return null;

  // Repartimos en dos columnas (par/impar). Si solo hay una imagen, ambas usan todas.
  const colA = images.filter((_, i) => i % 2 === 0);
  const colB = images.filter((_, i) => i % 2 === 1);
  const a = colA.length ? colA : images;
  const b = colB.length ? colB : images;

  // Velocidad proporcional al número de fotos (más fotos → bucle más largo).
  const secA = Math.max(22, a.length * 7);
  const secB = Math.max(22, b.length * 7);

  return (
    <section className="mt-16 md:mt-20">
      <h2
        className="text-center font-black text-white tracking-tight mb-2"
        style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)" }}
      >
        Resultados <span className="text-[#CAFF00]">reales</span>
      </h2>
      <p className="text-center text-[#A0A0A0] text-sm md:text-base mb-8">
        Transformaciones de mujeres como tú.
      </p>

      <div
        className="grid grid-cols-2 gap-4 max-w-xl mx-auto"
        style={{
          height: 560,
          maskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <Column images={a} dir="up" seconds={secA} />
        <Column images={b} dir="down" seconds={secB} />
      </div>
    </section>
  );
}
