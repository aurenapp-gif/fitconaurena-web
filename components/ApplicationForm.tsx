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
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("No hemos podido enviar tu solicitud. Revisa tu conexión.");
    }
  }

  if (status === "done") {
    return (
      <div className="max-w-xl mx-auto text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-[#CAFF00]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="section-title mb-4">¡Solicitud recibida!</h2>
        <p className="section-sub max-w-md mx-auto">
          Gracias por completar el formulario. Revisaremos tu caso y, si encajas en el
          programa, <strong className="text-white">te escribiremos muy pronto</strong> por
          email o WhatsApp.
        </p>
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
