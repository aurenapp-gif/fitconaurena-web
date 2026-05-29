"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "already" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LeadMagnetForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const driveUrl = process.env.NEXT_PUBLIC_DRIVE_FOLDER_URL;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage("Introduce un email válido.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/lead-magnet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, website }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        alreadyActive?: boolean;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(
          data.message ||
            "No hemos podido procesar tu email. Inténtalo de nuevo en unos minutos."
        );
        return;
      }

      setStatus(data.alreadyActive ? "already" : "success");
    } catch {
      setStatus("error");
      setErrorMessage(
        "No hemos podido procesar tu email. Inténtalo de nuevo en unos minutos."
      );
    }
  }

  const hasError = status === "error";

  return (
    <div className="w-full min-h-[200px] sm:min-h-[180px]">
      {status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="card-dark text-center motion-safe:animate-fade-in"
        >
          <InboxIcon className="w-12 h-12 mx-auto mb-4 text-[#CAFF00]" />
          <h2 className="font-black text-white text-2xl mb-3">
            Revisa tu correo
          </h2>
          <p className="text-[#A0A0A0] leading-relaxed">
            Te hemos enviado un email a{" "}
            <span className="text-white font-semibold">{email}</span>. Haz clic
            en el enlace de confirmación para acceder a los recursos.
          </p>
          <p className="text-sm text-[#8B8B8B] mt-5">
            ¿No lo ves? Revisa la carpeta de spam o promociones.
          </p>
        </div>
      )}

      {status === "already" && (
        <div
          role="status"
          aria-live="polite"
          className="card-dark text-center motion-safe:animate-fade-in"
        >
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-[#CAFF00]" />
          <h2 className="font-black text-white text-2xl mb-3">
            Ya estás suscrita
          </h2>
          <p className="text-[#A0A0A0] leading-relaxed mb-6">
            Aquí tienes el acceso directo a la carpeta de recursos.
          </p>
          {driveUrl ? (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand"
            >
              Abrir carpeta de recursos
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-sm text-[#8B8B8B]">
              En breve recibirás el enlace por email.
            </p>
          )}
        </div>
      )}

      {(status === "idle" || status === "loading" || status === "error") && (
        <form onSubmit={handleSubmit} noValidate className="w-full relative">
          <label htmlFor="lm-email" className="sr-only">
            Tu correo electrónico
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="lm-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (hasError) {
                  setStatus("idle");
                  setErrorMessage("");
                }
              }}
              disabled={status === "loading"}
              required
              aria-invalid={hasError || undefined}
              aria-describedby={hasError ? "lm-email-error" : undefined}
              className={`flex-1 px-5 py-3.5 rounded-xl bg-[#161616] text-white placeholder:text-[#8B8B8B] focus:outline-none transition-colors disabled:opacity-60 border ${
                hasError
                  ? "border-red-500/70 focus:border-red-500"
                  : "border-[#252525] focus:border-[#CAFF00]"
              }`}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-brand whitespace-nowrap disabled:opacity-70 disabled:cursor-wait min-w-[200px]"
            >
              {status === "loading" ? (
                <>
                  <SpinnerIcon className="w-4 h-4 motion-safe:animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  Quiero los recursos
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Honeypot: hidden from real users, often filled by bots */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-10000px",
              width: "1px",
              height: "1px",
              opacity: 0,
            }}
          />

          {hasError && errorMessage && (
            <p
              id="lm-email-error"
              className="text-sm text-red-400 mt-3"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

        </form>
      )}
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859" />
      <path d="M3.75 4.5h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </svg>
  );
}
