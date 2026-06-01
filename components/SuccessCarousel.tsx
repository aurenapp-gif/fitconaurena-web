"use client";

/* Carrusel de casos de éxito: dos filas HORIZONTALES que se deslizan en bucle
 * infinito y en sentidos opuestos. Decorativo (no clicable). Cada foto lleva su
 * tamaño real (width/height) para reservar el espacio desde el primer frame:
 * así la cinta mide bien antes de cargar las imágenes → velocidad constante y
 * sin huecos negros. Si no hay imágenes, no renderiza nada. */

export type Caso = { src: string; w: number; h: number };

function Row({ images, dir, seconds }: { images: Caso[]; dir: "left" | "right"; seconds: number }) {
  const loop = [...images, ...images]; // duplicado para un bucle sin saltos
  return (
    <div
      className="overflow-hidden"
      style={{
        // Difuminado en los bordes (blanco = visible; funciona en todos los navegadores).
        maskImage: "linear-gradient(to right, transparent, #fff 7%, #fff 93%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #fff 7%, #fff 93%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-4"
        style={{ animation: `${dir === "left" ? "marqueeLeft" : "marqueeRight"} ${seconds}s linear infinite` }}
      >
        {loop.map((img, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={img.src}
            width={img.w}
            height={img.h}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            // Evita guardar/arrastrar: sin menú de pulsación larga (iOS), sin
            // selección, sin interacción de puntero (son decorativas).
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", pointerEvents: "none" }}
            className="h-52 md:h-60 w-auto rounded-2xl border border-[#252525] object-cover bg-[#161616] shrink-0 select-none"
          />
        ))}
      </div>
    </div>
  );
}

export default function SuccessCarousel({ images }: { images: Caso[] }) {
  if (!images.length) return null;

  // Repartimos en dos filas (par/impar). Si solo hay una imagen, ambas usan todas.
  const rowA = images.filter((_, i) => i % 2 === 0);
  const rowB = images.filter((_, i) => i % 2 === 1);
  const a = rowA.length ? rowA : images;
  const b = rowB.length ? rowB : images;

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
