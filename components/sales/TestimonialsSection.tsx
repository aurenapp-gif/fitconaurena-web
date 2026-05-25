"use client";

import { useState } from "react";
import Image from "next/image";

interface Testimonial {
  id: string;
  title: string;
}

// Replace VIDEO_ID_X with real YouTube video IDs
const testimonials: Testimonial[] = [
  { id: "VIDEO_ID_1", title: "Testimonio de María" },
  { id: "VIDEO_ID_2", title: "Testimonio de Carmen" },
  { id: "VIDEO_ID_3", title: "Testimonio de Sara" },
  { id: "VIDEO_ID_4", title: "Testimonio de Laura" },
  { id: "VIDEO_ID_5", title: "Testimonio de Andrea" },
  { id: "VIDEO_ID_6", title: "Testimonio de Elena" },
];

function VideoCard({ id, title }: Testimonial) {
  const [playing, setPlaying] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#252525] transition-all duration-300 hover:border-[rgba(202,255,0,0.3)]"
      style={{ aspectRatio: "16/9", position: "relative" }}
    >
      {playing ? (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full h-full group block"
          aria-label={`Reproducir: ${title}`}
        >
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors duration-300" />

          {/* Play button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: "#CAFF00", boxShadow: "0 0 40px rgba(202,255,0,0.4)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="#0A0A0A"
                className="ml-1"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/80">{title}</span>
          </div>
        </button>
      )}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-wide">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="section-tag">Testimonios</span>
          <h2 className="section-title mb-4">
            Lo que dicen nuestras clientas
          </h2>
          <p className="section-sub max-w-lg mx-auto">
            Historias reales de mujeres que decidieron apostar por ellas mismas.
          </p>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <VideoCard key={t.id} {...t} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <p className="text-[#666666] text-sm mb-5">
            ¿Quieres ser la próxima historia de éxito?
          </p>
          <a href="#quiz" className="btn-brand text-base px-10 py-4">
            Empezar ahora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
