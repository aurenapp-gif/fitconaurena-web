"use client";

import { useState } from "react";
import Image from "next/image";

interface VSLSectionProps {
  videoId: string;
}

export default function VSLSection({ videoId }: VSLSectionProps) {
  const [playing, setPlaying] = useState(false);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <section className="py-20 md:py-28">
      <div className="container-content">
        {/* Section label */}
        <div className="text-center mb-10">
          <span className="section-tag">El método</span>
          <h2 className="section-title mb-4">
            Mira cómo funciona el programa
          </h2>
          <p className="section-sub max-w-xl mx-auto">
            En este vídeo te explicamos exactamente qué ocurre cuando entras al programa
            y cómo conseguimos resultados reales y duraderos.
          </p>
        </div>

        {/* Video player */}
        <div className="relative max-w-3xl mx-auto">
          {/* Glow backdrop */}
          <div
            className="absolute -inset-4 rounded-3xl blur-2xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #CAFF00, transparent)" }}
          />

          <div
            className="relative rounded-2xl overflow-hidden border border-[#252525] shadow-card"
            style={{ aspectRatio: "16/9" }}
          >
            {playing ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                onClick={() => setPlaying(true)}
                className="relative w-full h-full group block"
                aria-label="Reproducir vídeo"
              >
                {/* Thumbnail */}
                <Image
                  src={thumbnailUrl}
                  alt="Miniatura del vídeo"
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: "#CAFF00",
                      boxShadow: "0 0 60px rgba(202,255,0,0.4)",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="#0A0A0A"
                      className="ml-1"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Duration hint */}
                <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md text-xs font-semibold bg-black/70 text-white">
                  Ver vídeo
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
