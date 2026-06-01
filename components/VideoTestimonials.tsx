import YouTubeFacade from "@/components/YouTubeFacade";

/* Cuadrícula de testimonios en vídeo (YouTube). Si no hay vídeos, no renderiza. */
export default function VideoTestimonials({ ids, vertical }: { ids: string[]; vertical: boolean }) {
  if (!ids.length) return null;
  return (
    <section className="mt-14 md:mt-16">
      <h2
        className="text-center font-black text-white tracking-tight mb-2"
        style={{ fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)" }}
      >
        Lo que dicen <span className="text-[#CAFF00]">ellas</span>
      </h2>
      <p className="text-center text-[#A0A0A0] text-sm md:text-base mb-8">
        Testimonios reales de clientas del programa.
      </p>
      <div className={`grid gap-4 ${vertical ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {ids.map((id) => (
          <YouTubeFacade key={id} id={id} vertical={vertical} title="Testimonio" />
        ))}
      </div>
    </section>
  );
}
