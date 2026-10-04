"use client";

import { useState } from "react";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import s from "./acceso.module.css";

/** El WhatsApp de siempre, con el mensaje ya escrito: quien no puede entrar
 *  está nervioso y no va a redactar nada. */
const AYUDA = `https://wa.me/34607477339?text=${encodeURIComponent(
  "Hola, necesito ayuda para entrar al Programa FITCON"
)}`;

/**
 * La pantalla de acceso.
 *
 * Dos pasos, y los dos hacen falta:
 *
 *  1. El email. El servidor manda SIEMPRE la misma respuesta, sea clienta o
 *     no, para no ir diciendo quién está dentro del programa.
 *  2. El código de seis cifras. En el navegador basta con pulsar el enlace del
 *     correo, pero en la app instalada ese enlace abre Safari y deja la sesión
 *     en el sitio equivocado: por eso el código, que se escribe aquí dentro.
 */
export default function Acceso({ error, revoked }: { error?: boolean; revoked?: boolean }) {
  const [email, setEmail] = useState("");
  const [fase, setFase] = useState<"email" | "enviado">("email");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(
    revoked
      ? "Tu acceso ya no está activo. Si crees que es un error, escríbenos."
      : error
        ? "El enlace no es válido o ha caducado. Pide uno nuevo."
        : ""
  );

  const [codigo, setCodigo] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [avisoCodigo, setAvisoCodigo] = useState("");

  async function pedirAcceso(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const limpio = normalizeEmail(email);
    if (!isValidEmail(limpio)) {
      setAviso("Escribe un email válido, por ejemplo nombre@gmail.com");
      return;
    }
    setEnviando(true);
    setAviso("");
    try {
      const res = await fetch("/api/miembros/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: limpio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso(data.error ?? "Algo ha fallado. Inténtalo de nuevo.");
        return;
      }
      setEmail(limpio); // el código se verifica contra este mismo email
      setFase("enviado");
    } catch {
      setAviso("No hemos podido conectar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarConCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setAvisoCodigo("");
    try {
      const res = await fetch("/api/miembros/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codigo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAvisoCodigo(data.error ?? "Código incorrecto.");
        return;
      }
      // Recarga completa a propósito: así la app arranca con la sesión puesta.
      window.location.href = "/miembros";
    } catch {
      setAvisoCodigo("No hemos podido conectar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className={s.pantalla}>
      <div className={s.linea} aria-hidden="true" />
      <div className={s.halo} aria-hidden="true" />

      <header className={s.cabecera}>
        <div className={s.marca}>
          Programa <span>FITCON</span>
        </div>
        <a className={s.ayuda} href={AYUDA} target="_blank" rel="noopener noreferrer">
          ¿Necesitas ayuda?
        </a>
      </header>

      <main className={s.contenido}>
        <div className={`${s.sello} ${s.reveal} ${s.d1}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 16.8 6.1 20l1.3-6.5L2.5 8.9l6.6-.8L12 2z"
              fill="#4f9be8"
            />
          </svg>
          +1.000 mujeres transformadas
        </div>

        <h1 className={`${s.titulo} ${s.reveal} ${s.d2}`}>
          El programa <span className={s.chip}>nº1</span> para{" "}
          <span className={`${s.chip} ${s.chipB}`}>mujeres</span> en España
        </h1>

        <section className={`${s.tarjeta} ${s.reveal} ${s.d3}`} aria-live="polite">
          {fase === "email" ? (
            <div>
              <h2>Acceso para miembros</h2>
              <p>Pon tu email y te enviamos el acceso.</p>

              <form onSubmit={pedirAcceso} noValidate>
                <label className={s.etiqueta} htmlFor="email">
                  Tu email
                </label>
                <input
                  className={s.campo}
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                />
                {aviso && (
                  <p className={s.error} role="alert">
                    {aviso}
                  </p>
                )}
                <button className={s.boton} type="submit" disabled={enviando}>
                  {enviando ? "Enviando…" : "Recibir acceso"}
                  <span className={s.flecha} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 17L17 7M9 7h8v8"
                        stroke="#fff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </form>
              <p className={s.nota}>Te llegará un enlace y un código a tu correo.</p>
            </div>
          ) : (
            <div className={s.enviado}>
              <div className={s.ok} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="#4f9be8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2>Revisa tu correo</h2>
              <p>
                Hemos enviado tu enlace de acceso a <strong>{email}</strong>. Si no lo ves en unos
                minutos, mira en spam o promociones.
              </p>

              <form onSubmit={entrarConCodigo}>
                <label className={s.etiqueta} htmlFor="codigo">
                  ¿Usas la app? Escribe aquí tu código
                </label>
                <input
                  className={`${s.campo} ${s.codigo}`}
                  id="codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={codigo}
                  onChange={(ev) => setCodigo(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                {avisoCodigo && (
                  <p className={s.error} role="alert">
                    {avisoCodigo}
                  </p>
                )}
                <button className={s.boton} type="submit" disabled={entrando || codigo.length !== 6}>
                  {entrando ? "Entrando…" : "Entrar"}
                </button>
              </form>
              <p className={s.nota}>El enlace y el código caducan en 15 minutos.</p>

              <button
                className={s.volver}
                type="button"
                onClick={() => {
                  setFase("email");
                  setCodigo("");
                  setAvisoCodigo("");
                }}
              >
                Usar otro email
              </button>
            </div>
          )}
        </section>

        <div className={`${s.prueba} ${s.reveal} ${s.d4}`}>
          <div>
            <b>+1.000</b>casos de éxito
          </div>
          <div>
            <b>7 años</b>de experiencia
          </div>
        </div>
      </main>
    </div>
  );
}
