import Navbar from "@/components/Navbar";
import LeadMagnet from "@/components/LeadMagnet";
import SuccessCarousel from "@/components/SuccessCarousel";
import { getCasosExito } from "@/lib/casos";

export default function HomePage() {
  const casos = getCasosExito();
  return (
    <>
      <Navbar />
      <LeadMagnet />

      {/* Casos de éxito (debajo de la recogida de email) */}
      <div className="container-content pb-20 md:pb-24">
        <SuccessCarousel
          images={casos}
          header={
            <div className="text-center mb-8 max-w-2xl mx-auto">
              <p className="font-black text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 3vw, 1.9rem)" }}>
                Mujeres que como tú se sintieron perdidas, sin un rumbo y con un deseo: cambiar su vida y su físico.
              </p>
              <p className="font-black text-[#CAFF00] mt-3" style={{ fontSize: "clamp(1.2rem, 3vw, 1.9rem)" }}>
                Gracias al método Fit con Aurena
              </p>
            </div>
          }
        />
      </div>
    </>
  );
}
