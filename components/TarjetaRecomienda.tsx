import Link from "next/link";
import { COMISION_EUROS } from "@/lib/afiliados";

/**
 * La tarjeta de recomendación en el inicio de la clienta.
 *
 * Va después de «Tus planes» y no arriba del todo. Arriba están sus cosas: su
 * día, su revisión, su llamada. Si lo primero que ve al abrir la app es una
 * oferta de dinero, el programa deja de parecer suyo y empieza a parecer un
 * negocio. Donde está, la ve todo el que baja a mirar sus planes, que es todo
 * el mundo.
 *
 * Es la única cosa negra de la pantalla. No necesita ser grande ni gritar:
 * con ser la única, el ojo va solo.
 *
 * Y no explica el programa: lo anuncia. Lo explica la pantalla de detrás.
 * Meterlo todo aquí la convertiría en un ladrillo que se salta.
 */
export default function TarjetaRecomienda() {
  return (
    <Link
      href="/miembros/recomienda"
      className="relative block rounded-[16px] bg-ink text-page p-5 shadow-[0_10px_26px_rgb(28_27_25_/_0.18)]"
    >
      <span className="absolute top-4 right-5 text-[11px] uppercase tracking-[0.08em] text-page/50">
        Para ti
      </span>
      <p className="text-[30px] font-extrabold tracking-tight leading-none mb-2">{COMISION_EUROS} €</p>
      <p className="text-base leading-relaxed">Por cada mujer que recomiendes y entre al programa.</p>
      <span className="inline-block mt-4 rounded-[11px] bg-page text-ink font-bold text-[15px] px-5 py-2.5">
        Ver cómo funciona
      </span>
    </Link>
  );
}
