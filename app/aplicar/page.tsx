import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ApplicationForm from "@/components/ApplicationForm";
import SuccessCarousel, { type Caso } from "@/components/SuccessCarousel";

export const metadata: Metadata = {
  title: "Solicitud — Programa Fit con Aurena",
  // Página privada: no indexar ni seguir. Solo se entra con el enlace.
  robots: { index: false, follow: false, nocache: true },
};

// Descubre automáticamente las fotos de public/casos-exito (sin tocar código).
// Las dimensiones salen de manifest.json (generado al optimizar) para reservar
// el espacio exacto de cada foto. Si una foto no está en el manifiesto, usa un
// tamaño por defecto (sigue funcionando).
function getCasosExito(): Caso[] {
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

export default function AplicarPage() {
  const casos = getCasosExito();
  return (
    <>
      <Navbar />
      <main className="relative pt-16 overflow-hidden">
        {/* Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #CAFF00 0%, transparent 70%)" }}
        />

        <div className="container-narrow relative z-10 py-16 md:py-24">
          {/* Filtro / titular */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6 border border-[#CAFF00]/40 bg-[#CAFF00]/10 text-[#CAFF00] uppercase">
              Solo para mujeres de 25-40 años
            </div>
            <p className="text-[#A0A0A0] mb-6 text-sm md:text-base">
              ¿Con poco tiempo y cansada de hacer dietas?
            </p>
            <h1
              className="font-black text-white leading-[1.08] tracking-tight mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}
            >
              Te ayudo a perder <span className="text-[#CAFF00]">+9 kg</span> en tiempo
              récord comiendo lo que te gusta
            </h1>
            <p className="section-sub max-w-lg mx-auto">
              Sin pasar hambre, ni correr, ni matarte en el gym.
            </p>
          </div>

          {/* Formulario de calificación */}
          <p className="text-center font-black tracking-widest uppercase mb-4 text-[#CAFF00]"
             style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)" }}>
            Empieza aquí
          </p>
          <div className="card-dark p-6 md:p-10 !transform-none">
            <p className="text-center text-sm text-[#A0A0A0] mb-8">
              Responde unas preguntas rápidas para ver si encajas en el programa. Tardas
              menos de 1 minuto.
            </p>
            <ApplicationForm />
          </div>

          {/* Casos de éxito (debajo del cuestionario) */}
          <SuccessCarousel images={casos} />
        </div>
      </main>
    </>
  );
}
