"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coincide, loQueFalta, NOMBRE_MATERIAL, type Ejercicio, type Material } from "@/lib/ejercicios";
import { NOMBRE_GRUPO, type Grupo } from "@/lib/musculos";

/**
 * El catálogo, buscable.
 *
 * Filtra en el navegador y no en el servidor a propósito: son unas decenas de
 * fichas, caben enteras en la página, y así escribir en el buscador no espera
 * a nadie. El día que sean mil, esto se cambia; hoy sería complicarlo gratis.
 */
export default function CatalogoEjercicios({ ejercicios }: { ejercicios: Ejercicio[] }) {
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState<Grupo | "">("");
  const [material, setMaterial] = useState<Material | "">("");

  const grupos = useMemo<[Grupo, number][]>(() => {
    const cuenta = new Map<Grupo, number>();
    for (const e of ejercicios) cuenta.set(e.grupo, (cuenta.get(e.grupo) ?? 0) + 1);
    return Array.from(cuenta.entries()).sort((a, b) => b[1] - a[1]);
  }, [ejercicios]);

  const materiales = useMemo<[Material, number][]>(() => {
    const cuenta = new Map<Material, number>();
    for (const e of ejercicios) cuenta.set(e.material, (cuenta.get(e.material) ?? 0) + 1);
    return Array.from(cuenta.entries()).sort((a, b) => b[1] - a[1]);
  }, [ejercicios]);

  const lista = useMemo(
    () => ejercicios.filter((e) =>
      coincide(e, texto) && (!grupo || e.grupo === grupo) && (!material || e.material === material)
    ),
    [ejercicios, texto, grupo, material]
  );

  const chip = (activo: boolean) =>
    `shrink-0 text-[13px] rounded-xl px-3 min-h-[36px] inline-flex items-center transition-colors ${
      activo ? "bg-ink text-page font-semibold" : "bg-surface text-ink-muted"
    }`;

  return (
    <div>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar «hip thrust», «glúteo», «polea»…"
        aria-label="Buscar ejercicio"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:border-brand"
      />

      <div className="flex gap-2 overflow-x-auto py-3 -mx-1 px-1">
        <button type="button" className={chip(!grupo)} onClick={() => setGrupo("")}>Todos</button>
        {grupos.map(([g, n]) => (
          <button key={g} type="button" className={chip(grupo === g)} onClick={() => setGrupo(grupo === g ? "" : g)}>
            {NOMBRE_GRUPO[g]} <span className="opacity-60 ml-1">{n}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        <button type="button" className={chip(!material)} onClick={() => setMaterial("")}>Todo el material</button>
        {materiales.map(([m, n]) => (
          <button key={m} type="button" className={chip(material === m)} onClick={() => setMaterial(material === m ? "" : m)}>
            {NOMBRE_MATERIAL[m]} <span className="opacity-60 ml-1">{n}</span>
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-2">
        {lista.length} {lista.length === 1 ? "ejercicio" : "ejercicios"}
      </p>

      {lista.length === 0 ? (
        <p className="bg-surface rounded-xl p-4 text-[15px] text-ink-muted">
          Nada con eso. Prueba con otra palabra: también busca por como lo llamáis vosotros.
        </p>
      ) : (
        <div className="bg-surface rounded-xl divide-y divide-line">
          {lista.map((e) => {
            const falta = loQueFalta(e).filter((f) => f !== "imagen o vídeo");
            return (
              <Link key={e.id} href={`/miembros/ejercicios/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-ink leading-snug">{e.nombre}</span>
                  <span className="block text-[13px] text-ink-subtle">
                    {NOMBRE_GRUPO[e.grupo]} · {NOMBRE_MATERIAL[e.material]}
                  </span>
                </span>
                {falta.length > 0 && (
                  <span className="shrink-0 text-[12px] text-warn">incompleta</span>
                )}
                <span className="shrink-0 text-ink-subtle">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
