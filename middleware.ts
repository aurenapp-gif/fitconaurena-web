import { NextRequest, NextResponse } from "next/server";
import { VISTA_COOKIE } from "@/lib/cookies";

/**
 * Mirando «como ella», no se guarda nada.
 *
 * Las rutas que guardan usan la sesión REAL, así que lo que se pulsara se
 * apuntaría a nombre de quien mira: ni va a la clienta —que es lo que había
 * que evitar— ni tiene sentido a nombre propio. Un entreno empezado desde esa
 * vista le aparecería a la coach como suyo, y la pantalla, que lee los datos
 * de la clienta, no reflejaría el cambio: parecería que el botón no responde.
 *
 * Así que mientras el testigo esté puesto, el área de miembros es de solo
 * lectura. Se comprueba aquí, en un único sitio, y no ruta por ruta: una
 * ruta nueva no puede olvidarse de comprobarlo.
 *
 * No es una comprobación de permisos —el testigo solo vale acompañado de una
 * sesión de administración, y eso lo valida `vistaComo`—, es una barrera para
 * no escribir sin querer.
 */
export function middleware(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return NextResponse.next();
  if (!req.cookies.get(VISTA_COOKIE)?.value) return NextResponse.next();
  // Salir de la vista sí se permite: si no, no se podría salir.
  if (req.nextUrl.pathname === "/api/miembros/ver-como") return NextResponse.next();
  return NextResponse.json(
    { error: "Estás viendo la app como una clienta: aquí no se guarda nada. Sal de la vista para poder guardar." },
    { status: 409 }
  );
}

export const config = { matcher: "/api/miembros/:path*" };
