import SalesHero from "@/components/sales/SalesHero";
import VSLSection from "@/components/sales/VSLSection";
import QuizSection from "@/components/sales/QuizSection";
import SuccessCarousel from "@/components/sales/SuccessCarousel";
import TestimonialsSection from "@/components/sales/TestimonialsSection";

// ── Replace with your actual YouTube video ID ─────────────────────────────────
const VSL_VIDEO_ID = "dQw4w9WgXcQ";
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Transforma tu cuerpo — FitconAurena",
  description:
    "Programa 1:1 de nutrición y entrenamiento personalizado para mujeres. Pierde grasa, gana músculo y entiende tu cuerpo de una vez.",
};

export default function VentasPage() {
  return (
    <main className="min-h-screen">
      <SalesHero />
      <VSLSection videoId={VSL_VIDEO_ID} />

      {/* Divider */}
      <div className="container-wide">
        <div className="border-t border-[#252525]" />
      </div>

      <QuizSection />

      {/* Divider */}
      <div className="container-wide">
        <div className="border-t border-[#252525]" />
      </div>

      <SuccessCarousel />

      {/* Divider */}
      <div className="container-wide">
        <div className="border-t border-[#252525]" />
      </div>

      <TestimonialsSection />

      {/* Footer */}
      <footer className="border-t border-[#252525] py-8">
        <div className="container-wide text-center">
          <p className="text-xs text-[#666666]">
            © {new Date().getFullYear()} FitconAurena. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
