import { vistaComo } from "@/lib/guard";

/**
 * Aviso de «ver la app como ella», encima de todo lo del área de miembros.
 *
 * Va en el layout y no en cada página porque tiene que salir SIEMPRE: si está
 * puesto y no se ve, se acaba mirando la app de otra persona creyendo que es
 * la propia. Y por eso la salida es un enlace normal: funciona desde
 * cualquier pantalla, incluso desde una a la que la app te lleve sola.
 */
export default function MiembrosLayout({ children }: { children: React.ReactNode }) {
  const vista = vistaComo();
  return (
    <>
      {vista && (
        <div role="status" className="sticky top-0 z-50 bg-warn-soft text-ink border-b-2 border-warn px-4 py-2.5 flex items-center gap-3 text-[14px]">
          <span className="flex-1 min-w-0">
            Estás viendo la app como <strong className="break-all">{vista.mirando}</strong>. Lo que pulses se guarda a tu nombre, no al suyo.
          </span>
          <a href="/api/miembros/ver-como" className="shrink-0 font-semibold underline">Salir</a>
        </div>
      )}
      {children}
    </>
  );
}
