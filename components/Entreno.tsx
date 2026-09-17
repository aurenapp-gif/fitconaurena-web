"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claveEjercicio, compara, duracion, segundosDescanso, textoPeso, textoUltimaVez, type UltimaVez } from "@/lib/entrenos";
import type { DiaEntrenamiento, Ejercicio } from "@/lib/plan-estructura";

type SerieApuntada = { ejercicio: string; serie: number; peso: number | null; reps: number | null };

type Props = {
  dias: DiaEntrenamiento[];
  planId: string | null;
  planTitulo: string | null;
  sinPlan: boolean;
  ultimaVez: { clave: string; datos: UltimaVez }[];
  sesionAbierta: { id: string; dia: string | null; desde: string } | null;
  seriesDeHoy: SerieApuntada[];
};

/** Cuántas casillas de serie enseñar cuando el plan no dice cuántas son. */
const SERIES_POR_DEFECTO = 3;

const Chevron = () => (
  <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle shrink-0" aria-hidden="true">
    <path d="M1.5 1.5L7 7.5l-5.5 6" />
  </svg>
);

const Tic = ({ className = "" }: { className?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

/** Cuántas series pide el plan para ese ejercicio. */
function seriesDe(e: Ejercicio): number {
  return e.series && e.series > 0 ? e.series : SERIES_POR_DEFECTO;
}

/**
 * El entreno de hoy, apuntado mientras se entrena.
 *
 * Tres vistas en un solo componente y no tres páginas: todo pasa dentro de una
 * sesión abierta, y lo que se lleva apuntado tiene que seguir ahí al volver
 * atrás. Con páginas distintas, cada vuelta sería una recarga y la mitad del
 * gimnasio no tiene cobertura.
 */
export default function Entreno({ dias, planId, planTitulo, sinPlan, ultimaVez, sesionAbierta, seriesDeHoy }: Props) {
  const router = useRouter();
  const ultima = useMemo(() => new Map(ultimaVez.map((u) => [u.clave, u.datos])), [ultimaVez]);

  const [sesion, setSesion] = useState<string | null>(sesionAbierta?.id ?? null);
  const [desde, setDesde] = useState<string | null>(sesionAbierta?.desde ?? null);
  const [diaIdx, setDiaIdx] = useState(() => {
    const i = dias.findIndex((d) => d.nombre === sesionAbierta?.dia);
    return i >= 0 ? i : 0;
  });
  const [abierto, setAbierto] = useState<number | null>(null);
  const [apuntadas, setApuntadas] = useState<SerieApuntada[]>(seriesDeHoy);
  const [terminado, setTerminado] = useState<{ fin: string } | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const dia = dias[diaIdx] ?? null;

  async function llamar(cuerpo: Record<string, unknown>) {
    setError("");
    const res = await fetch("/api/miembros/entreno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(datos.error ?? "No se ha podido guardar. Inténtalo otra vez.");
    return datos as Record<string, unknown>;
  }

  async function empezar() {
    if (ocupado || !dia) return;
    setOcupado(true);
    try {
      const d = await llamar({ accion: "empezar", dia: dia.nombre, plan: planId });
      setSesion(String(d.sesion));
      setDesde(typeof d.desde === "string" ? d.desde : new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido empezar.");
    } finally {
      setOcupado(false);
    }
  }

  async function terminar() {
    if (!sesion || ocupado) return;
    setOcupado(true);
    try {
      const d = await llamar({ accion: "terminar", sesion });
      setTerminado({ fin: typeof d.fin === "string" ? d.fin : new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido cerrar.");
    } finally {
      setOcupado(false);
    }
  }

  function guardada(s: SerieApuntada) {
    setApuntadas((xs) => [...xs.filter((x) => x.ejercicio !== s.ejercicio || x.serie !== s.serie), s]);
  }
  function quitada(ejercicio: string, serie: number) {
    setApuntadas((xs) => xs.filter((x) => x.ejercicio !== ejercicio || x.serie !== serie));
  }

  const hechas = (nombre: string) => apuntadas.filter((a) => a.ejercicio === nombre);
  const completo = (e: Ejercicio) => hechas(e.nombre).length >= seriesDe(e);

  // ---- Sin plan de entrenamiento -------------------------------------------
  if (sinPlan || !dia) {
    return (
      <>
        <h1 className="page-title mb-1">Entreno</h1>
        <p className="text-[15px] text-ink-muted mb-5">Apunta tus pesos mientras entrenas.</p>
        <div className="bg-surface rounded-[14px] p-5">
          <p className="text-[17px] text-ink leading-snug">
            {sinPlan
              ? "Todavía no tienes plan de entrenamiento subido."
              : "Tu plan está subido, pero no he podido sacar los ejercicios."}
          </p>
          <p className="text-[15px] text-ink-muted mt-2">
            {sinPlan
              ? "En cuanto tu coach te lo suba, aquí podrás apuntar el peso de cada serie."
              : "Puedes verlo en Perfil → Planes. Díselo a tu coach y lo revisamos."}
          </p>
          <Link href="/miembros/perfil" className="inline-block mt-4 text-[15px] text-brand">Ir a mis planes</Link>
        </div>
      </>
    );
  }

  // ---- Resumen, al terminar ------------------------------------------------
  if (terminado) {
    const resumen = dia.ejercicios
      .map((e) => {
        const hs = hechas(e.nombre);
        if (!hs.length) return null;
        const top = hs.reduce((a, b) => ((b.peso ?? -1) > (a.peso ?? -1) ? b : a));
        return { nombre: e.nombre, ...compara(top.peso, ultima.get(claveEjercicio(e.nombre))?.peso ?? null) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const subidos = resumen.filter((r) => r.sentido === "sube").length;
    const bajados = resumen.filter((r) => r.sentido === "baja").length;

    return (
      <>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-success">
          Entreno hecho{desde ? ` · ${duracion(desde, terminado.fin)}` : ""}
        </p>
        <h1 className="page-title mt-1 mb-4">Bien hecho</h1>

        <div className="flex flex-col gap-3">
          <div className="bg-success-soft rounded-[14px] p-5">
            <p className="text-[21px] font-bold text-success leading-tight">
              {subidos > 0
                ? `Has subido peso en ${subidos} de ${resumen.length}`
                : `Has registrado ${resumen.length} ${resumen.length === 1 ? "ejercicio" : "ejercicios"}`}
            </p>
            {subidos > 0 && bajados === 0 && (
              <p className="text-[15px] text-success mt-1">Y no has bajado en ninguno.</p>
            )}
          </div>

          {resumen.length > 0 && (
            <div className="bg-surface rounded-[14px] px-4">
              {resumen.map((r, i) => (
                <div key={r.nombre} className={`flex items-center gap-3 py-3 ${i ? "border-t border-line" : ""}`}>
                  <span className="flex-1 text-[17px] min-w-0 truncate">{r.nombre}</span>
                  <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${
                    r.sentido === "sube" ? "bg-success-soft text-success"
                      : r.sentido === "baja" ? "bg-danger-soft text-danger"
                      : "bg-page text-ink-muted"}`}>
                    {r.texto}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface rounded-[14px] p-4 flex gap-3 items-start">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
              className="text-brand shrink-0 mt-0.5" aria-hidden="true">
              <rect x="5" y="4" width="14" height="17" rx="2.4" /><path d="M9 13l2.2 2.2L15.2 11" />
            </svg>
            <p className="text-[15px] text-ink-muted leading-snug">
              Esto se guarda solo. Cuando toque tu revisión, los pesos ya vendrán puestos.
            </p>
          </div>

          <Link href="/miembros" className="btn-brand text-center py-4 text-[17px]">Volver al inicio</Link>
        </div>
      </>
    );
  }

  // ---- Un ejercicio --------------------------------------------------------
  if (abierto !== null && dia.ejercicios[abierto]) {
    const e = dia.ejercicios[abierto];
    return (
      <VistaEjercicio
        ejercicio={e}
        posicion={`${abierto + 1} de ${dia.ejercicios.length}`}
        ultima={ultima.get(claveEjercicio(e.nombre)) ?? null}
        apuntadas={hechas(e.nombre)}
        sesion={sesion}
        volver={() => setAbierto(null)}
        siguiente={abierto + 1 < dia.ejercicios.length ? () => setAbierto(abierto + 1) : null}
        llamar={llamar}
        guardada={guardada}
        quitada={quitada}
      />
    );
  }

  // ---- El día --------------------------------------------------------------
  const listos = dia.ejercicios.filter(completo).length;
  return (
    <>
      <Link href="/miembros" className="text-[16px] text-brand">‹ Inicio</Link>
      <h1 className="page-title mt-2 mb-1">{dia.nombre}{dia.foco ? ` · ${dia.foco}` : ""}</h1>
      <p className="text-[15px] text-ink-muted mb-4">
        {dia.ejercicios.length} {dia.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
        {planTitulo ? ` · ${planTitulo}` : ""}
      </p>

      {dias.length > 1 && !sesion && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
          {dias.map((d, i) => (
            <button key={d.nombre + i} type="button" onClick={() => setDiaIdx(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-[15px] min-h-[40px] ${
                i === diaIdx ? "bg-brand text-white" : "bg-surface text-ink"}`}>
              {d.nombre}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-[15px] text-danger mb-3">{error}</p>}

      <div className="bg-surface rounded-[14px] px-4 mb-4">
        {dia.ejercicios.map((e, i) => {
          const u = ultima.get(claveEjercicio(e.nombre));
          const hs = hechas(e.nombre);
          const hecho = completo(e);
          const top = hs.length ? hs.reduce((a, b) => ((b.peso ?? -1) > (a.peso ?? -1) ? b : a)) : null;
          const c = top ? compara(top.peso, u?.peso ?? null) : null;
          return (
            <button key={e.nombre + i} type="button" disabled={!sesion} onClick={() => setAbierto(i)}
              className={`w-full flex items-center gap-3 py-3 text-left min-h-[56px] ${i ? "border-t border-line" : ""} ${sesion ? "" : "opacity-70"}`}>
              <span aria-hidden="true" className={`w-[22px] h-[22px] rounded-full shrink-0 grid place-items-center ${
                hecho ? "bg-success text-white" : "border-2 border-line"}`}>
                {hecho && <Tic />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] font-semibold truncate">{e.nombre}</span>
                <span className="block text-[15px] text-ink-muted truncate">
                  {[e.series ? `${e.series}×${e.repeticiones ?? "?"}` : e.repeticiones,
                    hs.length ? `hoy ${textoPeso(top?.peso ?? null)}` : u ? `la última vez ${textoPeso(u.peso)}` : null]
                    .filter(Boolean).join(" · ") || "Sin series indicadas"}
                </span>
              </span>
              {c && c.sentido !== "nuevo" && (
                <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  c.sentido === "sube" ? "bg-success-soft text-success" : c.sentido === "baja" ? "bg-danger-soft text-danger" : "bg-page text-ink-muted"}`}>
                  {c.texto}
                </span>
              )}
              {sesion && <Chevron />}
            </button>
          );
        })}
      </div>

      {!sesion ? (
        <button type="button" onClick={empezar} disabled={ocupado} className="btn-brand w-full py-4 text-[17px] disabled:opacity-60">
          {ocupado ? "Un momento…" : "Empezar entreno"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="bg-surface rounded-[14px] p-4 flex items-center gap-3">
            <span className="flex-1">
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Llevas</span>
              <span className="block text-[17px] font-semibold mt-0.5">
                {listos} de {dia.ejercicios.length} {dia.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
              </span>
            </span>
            {desde && <Cronometro desde={desde} />}
          </div>
          <button type="button" onClick={terminar} disabled={ocupado}
            className="w-full rounded-[14px] bg-ink text-page py-4 text-[17px] font-semibold disabled:opacity-60">
            {ocupado ? "Un momento…" : "Terminar entreno"}
          </button>
          <button type="button" onClick={async () => {
            if (!sesion) return;
            await llamar({ accion: "descartar", sesion }).catch(() => {});
            setSesion(null); setDesde(null); setApuntadas([]); router.refresh();
          }} className="text-[15px] text-ink-muted py-2">
            Descartar este entreno
          </button>
        </div>
      )}
    </>
  );
}

/** El tiempo que lleva entrenando. Se pinta en el cliente, que es donde corre. */
function Cronometro({ desde }: { desde: string }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="text-[26px] font-bold tracking-tight text-ink-muted tabular-nums">{mm}:{ss}</span>;
}

/* ------------------------------------------------------------------ */

function VistaEjercicio({
  ejercicio, posicion, ultima, apuntadas, sesion, volver, siguiente, llamar, guardada, quitada,
}: {
  ejercicio: Ejercicio;
  posicion: string;
  ultima: UltimaVez | null;
  apuntadas: SerieApuntada[];
  sesion: string | null;
  volver: () => void;
  siguiente: (() => void) | null;
  llamar: (c: Record<string, unknown>) => Promise<Record<string, unknown>>;
  guardada: (s: SerieApuntada) => void;
  quitada: (ejercicio: string, serie: number) => void;
}) {
  const total = seriesDe(ejercicio);
  const segundos = segundosDescanso(ejercicio.descanso);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState<number | null>(null);
  /** Cuándo empezó el descanso y qué serie toca luego. Null = no hay cuenta. */
  const [descanso, setDescanso] = useState<{ desde: number; siguiente: number } | null>(null);

  const valor = (n: number) => apuntadas.find((a) => a.serie === n) ?? null;

  async function apuntar(n: number, peso: string, reps: string) {
    if (!sesion) return;
    setGuardando(n);
    setError("");
    try {
      await llamar({ accion: "serie", sesion, ejercicio: ejercicio.nombre, serie: n, peso, reps });
      guardada({
        ejercicio: ejercicio.nombre,
        serie: n,
        peso: peso === "" ? null : Number(peso.replace(",", ".")),
        reps: reps === "" ? null : Number(reps),
      });
      // La cuenta atrás arranca al apuntar, que es justo cuando se suelta el
      // peso. Solo si queda alguna serie: descansar después de la última no
      // tiene sentido.
      if (segundos && n < total) setDescanso({ desde: Date.now(), siguiente: n + 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar.");
    } finally {
      setGuardando(null);
    }
  }

  async function borrar(n: number) {
    if (!sesion) return;
    try {
      await llamar({ accion: "quitar-serie", sesion, ejercicio: ejercicio.nombre, serie: n });
      quitada(ejercicio.nombre, n);
    } catch { /* si falla, la serie sigue ahí: no se miente sobre lo guardado */ }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" onClick={volver} className="text-[16px] text-brand">‹ Volver</button>
        <span className="flex-1" />
        <span className="text-[15px] text-ink-muted">{posicion}</span>
      </div>
      <h1 className="page-title mt-2 mb-1">{ejercicio.nombre}</h1>
      <p className="text-[15px] text-ink-muted mb-4">
        {[ejercicio.series ? `${ejercicio.series} series` : null,
          ejercicio.repeticiones ? `${ejercicio.repeticiones} repeticiones` : null,
          ejercicio.descanso ? `${ejercicio.descanso} de descanso` : null]
          .filter(Boolean).join(" · ") || "Apunta lo que hagas"}
      </p>

      <div className="flex flex-col gap-3">
        {ultima && (
          <div className="bg-success-soft rounded-[14px] px-4 py-3 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" className="text-success shrink-0" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span className="text-[15px] text-success">La última vez, {textoUltimaVez(ultima)}</span>
          </div>
        )}

        {error && <p role="alert" className="text-[15px] text-danger px-1">{error}</p>}

        <div className="bg-surface rounded-[14px] px-4">
          {Array.from({ length: total }, (_, i) => i + 1).map((n, i) => (
            <FilaSerie
              key={n}
              n={n}
              inicial={valor(n)}
              guardando={guardando === n}
              primera={i === 0}
              sugerido={ultima}
              onGuardar={(peso, reps) => apuntar(n, peso, reps)}
              onBorrar={() => borrar(n)}
            />
          ))}
        </div>

        {descanso && segundos && (
          <Descanso desde={descanso.desde} segundos={segundos} siguiente={descanso.siguiente}
            fin={() => setDescanso(null)} />
        )}

        {ejercicio.nota && (
          <div className="bg-surface rounded-[14px] p-4">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Cómo lo quiere tu coach</p>
            <p className="text-[16px] leading-snug mt-2">{ejercicio.nota}</p>
          </div>
        )}

        <Link href="/miembros/tecnica" className="bg-surface rounded-[14px] p-4 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            className="text-ink-muted shrink-0" aria-hidden="true">
            <rect x="3" y="6" width="13" height="12" rx="2.6" /><path d="M16 11l5-3v8l-5-3z" />
          </svg>
          <span className="flex-1 text-[16px] font-semibold">Grabarme para que me corrija</span>
          <Chevron />
        </Link>

        {siguiente && (
          <button type="button" onClick={siguiente} className="btn-brand w-full py-4 text-[17px]">Siguiente ejercicio</button>
        )}
      </div>
    </>
  );
}

/**
 * La cuenta atrás entre series.
 *
 * Se sigue viendo al llegar a cero, en vez de desaparecer: si alguien mira el
 * móvil pasado el tiempo, quiere saber cuánto se le ha ido, no encontrarse con
 * que la tarjeta ya no está.
 */
function Descanso({ desde, segundos, siguiente, fin }: {
  desde: number; segundos: number; siguiente: number; fin: () => void;
}) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const restan = segundos - Math.floor((ahora - desde) / 1000);
  const listo = restan <= 0;
  const abs = Math.abs(restan);
  const reloj = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;

  return (
    <div className={`rounded-[14px] p-4 flex items-center gap-4 ${listo ? "bg-success-soft" : "bg-ink text-page"}`}>
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-semibold uppercase tracking-wide ${listo ? "text-success" : "opacity-70"}`}>
          {listo ? "Listo" : "Descanso"}
        </span>
        <span className={`block text-[15px] mt-0.5 ${listo ? "text-success" : ""}`}>Te toca la serie {siguiente}</span>
      </span>
      <span className={`text-[28px] font-bold tracking-tight tabular-nums ${listo ? "text-success" : ""}`}>
        {listo ? `+${reloj}` : reloj}
      </span>
      <button type="button" onClick={fin} aria-label="Quitar la cuenta atrás"
        className={`shrink-0 w-8 h-8 rounded-full grid place-items-center ${listo ? "text-success" : "opacity-70"}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

/**
 * Una serie: peso y repeticiones.
 *
 * El teclado es numérico con coma, porque los discos van de 2,5 en 2,5 y en un
 * móvil español la tecla decimal es la coma. Se guarda al salir del campo y no
 * con un botón por serie: entre serie y serie no se está para botones.
 */
function FilaSerie({
  n, inicial, guardando, primera, sugerido, onGuardar, onBorrar,
}: {
  n: number;
  inicial: SerieApuntada | null;
  guardando: boolean;
  primera: boolean;
  sugerido: UltimaVez | null;
  onGuardar: (peso: string, reps: string) => void;
  onBorrar: () => void;
}) {
  const [peso, setPeso] = useState(inicial?.peso != null ? String(inicial.peso).replace(".", ",") : "");
  const [reps, setReps] = useState(inicial?.reps != null ? String(inicial.reps) : "");
  const guardado = useRef(`${inicial?.peso ?? ""}|${inicial?.reps ?? ""}`);

  useEffect(() => {
    setPeso(inicial?.peso != null ? String(inicial.peso).replace(".", ",") : "");
    setReps(inicial?.reps != null ? String(inicial.reps) : "");
    guardado.current = `${inicial?.peso ?? ""}|${inicial?.reps ?? ""}`;
  }, [inicial?.peso, inicial?.reps]);

  const hecha = inicial !== null;

  function alSalir() {
    const clave = `${peso === "" ? "" : Number(peso.replace(",", "."))}|${reps === "" ? "" : Number(reps)}`;
    if (clave === guardado.current) return;
    if (peso === "" && reps === "") { if (hecha) onBorrar(); guardado.current = "|"; return; }
    guardado.current = clave;
    onGuardar(peso, reps);
  }

  const campo = "bg-page rounded-[9px] px-3 py-2 text-[16px] font-semibold text-center w-[86px] outline-none focus:ring-2 focus:ring-brand/40";

  return (
    <div className={`flex items-center gap-2 py-2.5 ${primera ? "" : "border-t border-line"}`}>
      <span className="w-[62px] text-[15px] text-ink-muted shrink-0">Serie {n}</span>
      <label className="sr-only" htmlFor={`peso-${n}`}>Peso de la serie {n}, en kilos</label>
      <input id={`peso-${n}`} value={peso} onChange={(e) => setPeso(e.target.value)} onBlur={alSalir}
        inputMode="decimal" placeholder={sugerido?.peso != null ? String(sugerido.peso).replace(".", ",") : "kg"}
        className={campo} />
      <label className="sr-only" htmlFor={`reps-${n}`}>Repeticiones de la serie {n}</label>
      <input id={`reps-${n}`} value={reps} onChange={(e) => setReps(e.target.value)} onBlur={alSalir}
        inputMode="numeric" placeholder={sugerido?.reps != null ? String(sugerido.reps) : "reps"}
        className={campo} />
      <span className="flex-1" />
      <span aria-hidden="true" className={`w-6 h-6 rounded-full shrink-0 grid place-items-center ${
        guardando ? "border-2 border-brand animate-pulse" : hecha ? "bg-success text-white" : "border-2 border-line"}`}>
        {hecha && !guardando && <Tic />}
      </span>
    </div>
  );
}
