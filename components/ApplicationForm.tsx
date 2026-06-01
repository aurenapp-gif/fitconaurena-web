"use client";

import { useState } from "react";
import { QUESTIONS, type Answers } from "@/lib/application";

type Status = "idle" | "loading" | "done" | "error";

// Pasos: una pregunta de opción por pantalla + motivación (texto) + contacto.
type Step =
  | { kind: "radio"; index: number }
  | { kind: "text" }
  | { kind: "contact" };

const STEPS: Step[] = [
  ...QUESTIONS.map((_, index) => ({ kind: "radio" as const, index })),
  { kind: "text" as const },
  { kind: "contact" as const },
];
const TOTAL = STEPS.length;

const WHATSAPP_URL = `https://wa.me/34607477339?text=${encodeURIComponent(
  "Quiero agendar una llamada gratuita"
)}`;

// Calendly: si está configurado, se muestra el calendario incrustado al calificar
// (con los colores de la marca). Mientras no esté, se mantiene WhatsApp de respaldo.
const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? "";
const CALENDLY_SRC = CALENDLY_URL
  ? `${CALENDLY_URL}${CALENDLY_URL.includes("?") ? "&" : "?"}hide_gdpr_banner=1&background_color=0a0a0a&text_color=ffffff&primary_color=caff00`
  : "";

const DRIVE_URL =
  process.env.NEXT_PUBLIC_GUIDE_URL ??
  "https://drive.google.com/drive/folders/1WYqSTwxTcAC4rQAULf-EwhBp2XDfxVOc";

export default function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [motivacion, setMotivacion] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [qualified, setQualified] = useState(false);

  function pick(qid: string, value: string) {
    setAnswers((a) => ({ ...a, [qid]: value }));
    // Auto-avance a la siguiente pantalla.
    setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL - 1)), 220);
  }

  function back() {
    setMessage("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (status === "loading") return;
    const allAnswered = QUESTIONS.every((q) => answers[q.id]);
    if (!allAnswered || !motivacion.trim() || !nombre || !email || !telefono) {
      setStatus("error");
      setMessage("Completa todos los pasos y tus datos.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono, answers, motivacion, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Algo ha fallado. Inténtalo de nuevo.");
        return;
      }
      setQualified(!!data.qualified);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("No hemos podido enviar tu solicitud. Revisa tu conexión.");
    }
  }

  if (status === "done") {
    if (qualified) {
      return (
        <div className="max-w-xl mx-auto text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-[#CAFF00]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="section-title mb-4">¡Encajas en el programa! 🎉</h2>
          {CALENDLY_SRC ? (
            <>
              <p className="section-sub max-w-md mx-auto mb-6">
                Da el último paso: <strong className="text-white">agenda tu llamada gratuita</strong> y
                diseñamos tu plan.
              </p>
              <div className="rounded-2xl overflow-hidden border border-[#252525] bg-[#0A0A0A]">
                <iframe
                  src={CALENDLY_SRC}
                  title="Agenda tu llamada gratuita"
                  width="100%"
                  height={700}
                  style={{ border: 0, display: "block" }}
                  loading="lazy"
                />
              </div>
            </>
          ) : (
            <>
              <p className="section-sub max-w-md mx-auto mb-8">
                Da el último paso: agenda tu <strong className="text-white">llamada gratuita</strong> por
                WhatsApp y diseñamos tu plan.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand text-base px-8 py-4 inline-flex"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.69 5.526l-.999 3.648 3.808-.999zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                Agendar mi llamada gratuita
              </a>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="max-w-xl mx-auto text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 border border-[#252525] bg-[#161616]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#CAFF00" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" />
          </svg>
        </div>
        <h2 className="section-title mb-4">Gracias por tu interés</h2>
        <p className="section-sub max-w-md mx-auto mb-6">
          Este servicio requiere una <strong className="text-white">inversión mínima de tiempo y
          dinero</strong> para poder conseguirlo. Somos un servicio comprometido al máximo con
          el cliente: no solo adaptamos una estrategia única a la situación de cada persona,
          también te guiamos a diario para que consigas tu objetivo <strong className="text-white">sí o sí</strong>.
        </p>
        <p className="section-sub max-w-md mx-auto mb-8">
          Mientras tanto, puedes acceder a nuestro <strong className="text-white">contenido
          gratuito</strong> para empezar a llevar tu físico al siguiente nivel.
        </p>
        <a
          href={DRIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand text-base px-8 py-4 inline-flex"
        >
          Acceder al contenido gratuito
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </a>
      </div>
    );
  }

  const current = STEPS[step];
  const progress = Math.round(((step + 1) / TOTAL) * 100);

  return (
    <div className="max-w-xl mx-auto">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {/* Barra de progreso */}
      <div className="mb-2 flex items-center justify-between text-xs text-[#666666]">
        <span>Paso {step + 1} de {TOTAL}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#1c1c1c] mb-8 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#CAFF00] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Contenido del paso */}
      <div className="min-h-[280px]">
        {current.kind === "radio" && (() => {
          const q = QUESTIONS[current.index];
          return (
            <div>
              <h3 className="font-black text-white text-xl md:text-2xl mb-6 leading-snug">
                {q.label}
              </h3>
              <div className="flex flex-col gap-3">
                {q.options.map((o) => {
                  const selected = answers[q.id] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick(q.id, o.value)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${
                        selected
                          ? "border-[#CAFF00] bg-[#CAFF00]/10"
                          : "border-[#252525] bg-[#0A0A0A] hover:border-[#3a3a3a]"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selected ? "border-[#CAFF00]" : "border-[#444]"
                        }`}
                      >
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#CAFF00]" />}
                      </span>
                      <span className={`text-sm ${selected ? "text-white" : "text-[#A0A0A0]"}`}>
                        {o.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {current.kind === "text" && (
          <div>
            <h3 className="font-black text-white text-xl md:text-2xl mb-6 leading-snug">
              ¿Qué te ha inspirado a empezar tu cambio con nosotros y qué te gustaría conseguir?
            </h3>
            <textarea
              value={motivacion}
              onChange={(e) => setMotivacion(e.target.value)}
              rows={5}
              placeholder="Cuéntanos un poco sobre ti y tu objetivo…"
              className="w-full rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors resize-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!motivacion.trim()) {
                  setStatus("error");
                  setMessage("Escribe una respuesta para continuar.");
                  return;
                }
                setStatus("idle");
                setMessage("");
                setStep((s) => s + 1);
              }}
              className="btn-brand text-base px-8 py-4 w-full mt-4"
            >
              Continuar
            </button>
          </div>
        )}

        {current.kind === "contact" && (
          <div>
            <h3 className="font-black text-white text-xl md:text-2xl mb-2 leading-snug">
              Casi está 🎉
            </h3>
            <p className="text-sm text-[#A0A0A0] mb-6">
              Déjanos tus datos y te contactamos si encajas en el programa.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre" aria-label="Tu nombre" autoComplete="name"
                className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
              />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com" aria-label="Tu email" autoComplete="email"
                className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
              />
              <input
                type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)}
                placeholder="Tu WhatsApp / teléfono" aria-label="Tu teléfono o WhatsApp" autoComplete="tel"
                className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={status === "loading"}
              className="btn-brand text-base px-8 py-4 w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Enviando…" : "Enviar mi solicitud"}
            </button>
          </div>
        )}
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-[#FF6B6B] text-center mt-4">{message}</p>
      )}

      {step > 0 && (
        <button
          type="button"
          onClick={back}
          className="mt-6 text-sm text-[#666666] hover:text-white transition-colors"
        >
          ← Atrás
        </button>
      )}
    </div>
  );
}
