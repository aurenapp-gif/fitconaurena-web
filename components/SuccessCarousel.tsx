"use client";

/* Carrusel de casos de éxito: dos filas HORIZONTALES que se deslizan en bucle
 * infinito y en sentidos opuestos. Decorativo (no clicable). Si no hay
 * imágenes, no renderiza nada. Las fotos se descubren solas desde
 * public/casos-exito (ver app/aplicar/page.tsx). */

function Row({ images, dir, seconds }: { images: string[]; dir: "left" | "right"; seconds: number }) {
  const loop = [...images, ...images]; // duplicado para un bucle sin saltos
  return (
    <div
      className="overflow-hidden"
      style={{
        // Difuminado en los bordes (blanco = visible; funciona en todos los navegadores).
        maskImage: "linear-gradient(to right, transparent, #fff 8%, #fff 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #fff 8%, #fff 92%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-4"
        style={{ animation: `${dir === "left" ? "marqueeLeft" : "marqueeRight"} ${seconds}s linear infinite` }}
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
            className="h-52 md:h-64 w-auto rounded-2xl border border-[#252525] object-cover shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

export default function SuccessCarousel({ images }: { images: string[] }) {
  if (!images.length) return null;

  // Repartimos en dos filas (par/impar). Si solo hay una imagen, ambas usan todas.
  const rowA = images.filter((_, i) => i % 2 === 0);
  const rowB = images.filter((_, i) => i % 2 === 1);
  const a = rowA.length ? rowA : images;
  const b = rowB.length ? rowB : images;

  // Velocidad proporcional al nº de fotos (más fotos → bucle más largo).
  // Filas a ritmos algo distintos para que se note el movimiento opuesto.
  const secA = Math.max(14, a.length * 3);
  const secB = Math.max(16, b.length * 3.4);

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

      <div className="flex flex-col gap-4">
        <Row images={a} dir="left" seconds={secA} />
        <Row images={b} dir="right" seconds={secB} />
      </div>
    </section>
  );
}
