"use client";

/* Carrusel de casos de éxito: dos filas HORIZONTALES que se deslizan en bucle
 * infinito y en sentidos opuestos. Decorativo (no clicable). Cada foto lleva su
 * tamaño real (width/height) para reservar el espacio desde el primer frame:
 * así la cinta mide bien antes de cargar las imágenes → velocidad constante y
 * sin huecos negros. Si no hay imágenes, no renderiza nada. */

import type { Caso } from "@/lib/casos";

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
          // Foto pintada como FONDO de un div (no es <img>): no se puede guardar
          // con pulsación larga ni arrastrar. aspect-ratio reserva el espacio.
          <div
            key={i}
            aria-hidden="true"
            className="h-52 md:h-60 w-auto rounded-2xl border border-line bg-surface bg-cover bg-center shrink-0 pointer-events-none select-none"
            style={{
              aspectRatio: `${img.w} / ${img.h}`,
              backgroundImage: `url("${img.src}")`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function SuccessCarousel({
  images,
  header,
  className = "mt-16 md:mt-20",
}: {
  images: Caso[];
  header?: React.ReactNode;
  className?: string;
}) {
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
    <section className={className}>
      {header ?? (
        <>
          <p className="text-center font-black tracking-wide uppercase mb-4 text-brand max-w-2xl mx-auto"
             style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)" }}>
            Paso 3: Comprueba cómo mujeres como tú han conseguido el cambio que tanto deseas con el método Fit con Aurena
          </p>
          <h2
            className="text-center font-black text-ink tracking-tight mb-2"
            style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)" }}
          >
            Resultados <span className="text-brand">reales</span>
          </h2>
          <p className="text-center text-ink-muted text-sm md:text-base mb-8">
            Transformaciones de mujeres como tú.
          </p>
        </>
      )}

      <div className="flex flex-col gap-4">
        <Row images={a} dir="left" seconds={secA} />
        <Row images={b} dir="right" seconds={secB} />
      </div>
    </section>
  );
}
