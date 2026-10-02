import { textoDelta, textoPeriodo, type AnguloId } from "@/lib/comparativa-fotos";

/** Un ángulo ya resuelto: las dos fotos firmadas y lo que cambió entre ellas. */
export type ParFirmado = {
  id: AnguloId;
  nombre: string;
  dias: number;
  peso: number | null;
  cintura: number | null;
  primera: { fecha: string; thumb?: string; full?: string; peso: number | null };
  ultima: { fecha: string; thumb?: string; full?: string; peso: number | null };
};

const NOMBRE: Record<AnguloId, string> = { frente: "de frente", perfil: "de perfil", espaldas: "de espaldas" };

function lista(ids: AnguloId[]): string {
  const n = ids.map((i) => NOMBRE[i]);
  if (n.length <= 1) return n.join("");
  return `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
}

const fecha = (d: string) =>
  new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit", timeZone: "Europe/Madrid" });

/**
 * Las fotos van en 9:16, que es la forma de una foto de móvil: en 3:4 había
 * que recortarle la cabeza o los pies a casi todas, y aquí se mira el cuerpo
 * entero. Pinchando se abre la original sin recortar.
 */
function Foto({ src, full, alt, pie, nota }: { src?: string; full?: string; alt: string; pie: string; nota?: string }) {
  const img = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-full aspect-[9/16] object-cover rounded-[11px] bg-white/10" />
  ) : (
    <div className="w-full aspect-[9/16] rounded-[11px] bg-white/10" aria-hidden="true" />
  );
  return (
    <figure className="flex-1 min-w-0 m-0">
      {full ? (
        <a href={full} target="_blank" rel="noopener noreferrer" title="Ver la foto entera">{img}</a>
      ) : img}
      <figcaption className="mt-1.5 text-center">
        <span className="block text-[13px] font-semibold">{pie}</span>
        {nota && <span className="block text-[12px] text-page/60">{nota}</span>}
      </figcaption>
    </figure>
  );
}

/**
 * «Antes y ahora» de una clienta, para la coach.
 *
 * Los tres ángulos a la vez y sin pestañas: la coach quiere ver de un vistazo
 * en qué ha cambiado, no ir pulsando. Fondo oscuro porque una foto de cuerpo
 * entero sobre fondo claro no se lee, igual que en la pantalla de la clienta.
 */
export default function FotosAntesYAhora({
  pares,
  soloUna = [],
  sinNinguna = [],
}: {
  pares: ParFirmado[];
  soloUna?: AnguloId[];
  sinNinguna?: AnguloId[];
}) {
  if (pares.length === 0) {
    return (
      <p className="text-[13px] text-ink-muted">
        {soloUna.length > 0
          ? `Solo hay una foto ${lista(soloUna)}. Con la siguiente revisión ya habrá con qué compararla.`
          : "Todavía no ha subido fotos en sus revisiones."}
      </p>
    );
  }

  return (
    <div className="rounded-[16px] bg-ink text-page p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pares.map((p) => (
          <div key={p.id} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-[14px] font-semibold">{p.nombre}</span>
              <span className="text-[12px] text-page/60">{textoPeriodo(p.dias)}</span>
            </div>
            <div className="flex gap-2">
              <Foto
                src={p.primera.thumb} full={p.primera.full}
                alt={`${p.nombre}, primera revisión`}
                pie={fecha(p.primera.fecha)}
                nota={p.primera.peso != null ? `${p.primera.peso.toLocaleString("es-ES")} kg` : undefined}
              />
              <Foto
                src={p.ultima.thumb} full={p.ultima.full}
                alt={`${p.nombre}, última revisión`}
                pie={fecha(p.ultima.fecha)}
                nota={p.ultima.peso != null ? `${p.ultima.peso.toLocaleString("es-ES")} kg` : undefined}
              />
            </div>
            {(p.peso !== null && p.peso !== 0) || (p.cintura !== null && p.cintura !== 0) ? (
              <p className="mt-2 text-[13px] text-page/70">
                {[
                  p.peso !== null && p.peso !== 0 ? textoDelta(p.peso, "kg") : null,
                  p.cintura !== null && p.cintura !== 0 ? `${textoDelta(p.cintura, "cm")} de cintura` : null,
                ].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {(soloUna.length > 0 || sinNinguna.length > 0) && (
        <p className="text-[12px] text-page/60 mt-4">
          {soloUna.length > 0 && `Solo hay una foto ${lista(soloUna)}. `}
          {sinNinguna.length > 0 && `No hay ninguna ${lista(sinNinguna)}.`}
        </p>
      )}
    </div>
  );
}
