"use client";

import { useState } from "react";

export type FotoRevision = {
  fecha: string;
  etiqueta: string;
  frente?: string;
  perfil?: string;
  espaldas?: string;
  cintura: number | null;
};

const VISTAS = [
  { id: "frente", nombre: "Frente" },
  { id: "perfil", nombre: "Perfil" },
  { id: "espaldas", nombre: "Espaldas" },
] as const;

/**
 * Sus fotos, la primera al lado de la última.
 *
 * En oscuro y a pantalla ancha porque es donde se ven: una foto de cuerpo
 * entero sobre fondo claro y rodeada de tarjetas no dice nada. Y con un
 * deslizador para elegir con cuál comparar, que el cambio de un mes no se ve
 * pero el de seis sí.
 */
export default function Comparador({ fotos }: { fotos: FotoRevision[] }) {
  const [vista, setVista] = useState<(typeof VISTAS)[number]["id"]>("frente");
  const [i, setI] = useState(0);

  const conEsta = fotos.filter((f) => f[vista]);
  if (conEsta.length < 2) return null;

  const antes = conEsta[Math.min(i, conEsta.length - 2)];
  const ahora = conEsta[conEsta.length - 1];
  const cm = antes.cintura != null && ahora.cintura != null
    ? Math.round((antes.cintura - ahora.cintura) * 10) / 10 : null;

  return (
    <div className="rounded-[16px] bg-ink text-page p-4 flex flex-col gap-4">
      <div className="flex gap-2">
        {VISTAS.map((v) => {
          const hay = fotos.filter((f) => f[v.id]).length >= 2;
          return (
            <button key={v.id} type="button" disabled={!hay} onClick={() => { setVista(v.id); setI(0); }}
              className={`rounded-full px-4 py-2 text-[15px] min-h-[40px] disabled:opacity-30 ${
                vista === v.id ? "bg-page text-ink font-semibold" : "bg-white/12 text-page"}`}>
              {v.nombre}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {[antes, ahora].map((f, k) => (
          <figure key={k} className="flex-1 min-w-0 m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f[vista]} alt={`${vista}, ${f.etiqueta}`}
              className="w-full aspect-[3/4] object-cover rounded-[13px] bg-white/10" />
            <figcaption className="text-center mt-2">
              <span className="block text-[15px] font-semibold">{f.etiqueta}</span>
              {f.cintura != null && <span className="block text-[13px] text-page/60">{f.cintura.toLocaleString("es-ES")} cm de cintura</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {cm !== null && cm !== 0 && (
        <div className="rounded-[13px] bg-white/10 px-4 py-3">
          <p className="text-[21px] font-bold tracking-tight" style={{ color: cm > 0 ? "#A9C8AD" : "#E3C08C" }}>
            {cm > 0 ? `${cm.toLocaleString("es-ES")} centímetros menos` : `${Math.abs(cm).toLocaleString("es-ES")} centímetros más`}
          </p>
          <p className="text-[14px] text-page/70 mt-0.5">de cintura, entre esas dos fotos</p>
        </div>
      )}

      {conEsta.length > 2 && (
        <div>
          <label htmlFor="comparar-con" className="block text-[13px] uppercase tracking-wide text-page/60">Comparar con</label>
          <input id="comparar-con" type="range" min={0} max={conEsta.length - 2} value={Math.min(i, conEsta.length - 2)}
            onChange={(e) => setI(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: "#8FAE93" }} />
          <div className="flex justify-between text-[13px] text-page/60 mt-0.5">
            <span>{conEsta[0].etiqueta}</span>
            <span>{ahora.etiqueta}</span>
          </div>
        </div>
      )}

      <p className="text-[13px] text-page/60">Solo tú y tu coach veis estas fotos.</p>
    </div>
  );
}
