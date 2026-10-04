import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import Acceso from "@/components/Acceso";

/*
 * La única pantalla con tipografía propia. El resto del programa usa la letra
 * del sistema a propósito (en el iPhone es la de sus apps y se pinta a la
 * primera), pero aquí el titular vive del tracking cerrado de Inter Tight: con
 * la del sistema se deshace. `next/font` la descarga en el build y la sirve
 * desde nuestro dominio, así que no hay petición a Google ni que tocar la CSP.
 */
const letra = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acceso para miembros",
  robots: { index: false, follow: false },
};

/** La barra del navegador, oscura como la pantalla. El resto de la app la pone
 *  clara desde el layout. */
export const viewport: Viewport = {
  themeColor: "#08090c",
};

export default function AccesoPage({
  searchParams,
}: {
  searchParams: { error?: string; revoked?: string };
}) {
  return (
    <div className={letra.className}>
      <Acceso error={!!searchParams.error} revoked={!!searchParams.revoked} />
    </div>
  );
}
