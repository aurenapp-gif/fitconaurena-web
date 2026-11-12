import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Acceso from "@/components/Acceso";

/*
 * La única pantalla con tipografía propia. El resto del programa usa la letra
 * del sistema a propósito (en el iPhone es la de sus apps y se pinta a la
 * primera), pero aquí el titular vive del tracking cerrado de Inter Tight: con
 * la del sistema se deshace.
 *
 * El fichero vive en el repositorio y NO se baja de Google al compilar. Antes
 * sí, y el 6 y el 12 de noviembre Google no respondió: el build se cayó
 * entero y bloqueó el despliegue por algo ajeno al programa. Así compila
 * igual aunque Google esté caído, y sigue sin haber petición a Google desde
 * el navegador ni nada que tocar en la CSP.
 */
const letra = localFont({
  src: "../../fuentes/InterTight-latin.woff2",
  // Una sola variable cubre de 400 a 700: 44 KB en vez de cuatro ficheros.
  weight: "400 700",
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
