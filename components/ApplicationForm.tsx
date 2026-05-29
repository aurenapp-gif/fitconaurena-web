"use client";

import { useState } from "react";
import { QUESTIONS, type Answers } from "@/lib/application";

type Status = "idle" | "loading" | "done" | "error";

export default function ApplicationForm() {
  const [answers, setAnswers] = useState<Answers>({});
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function setAnswer(qid: string, value: string) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const allAnswered = QUESTIONS.every((q) => answers[q.id]);
    if (!allAnswered || !nombre || !email || !telefono) {
      setStatus("error");
      setMessage("Responde todas las preguntas y completa tus datos.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono, answers, website }),
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
      <div className="max-w-xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-[#CAFF00]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="section-title mb-4">¡Solicitud recibida!</h2>
        <p className="section-sub max-w-md mx-auto">
          Gracias por completar el formulario. Revisaremos tu caso y, si encajas en
          el programa, <strong className="text-white">te escribiremos muy pronto</strong> por
          email o WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
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

      <div className="flex flex-col gap-8">
        {QUESTIONS.map((q, i) => (
          <fieldset key={q.id}>
            <legend className="font-bold text-white mb-3 text-left">
              <span className="text-[#CAFF00]">{i + 1}.</span> {q.label}
            </legend>
            <div className="flex flex-col gap-2">
              {q.options.map((o) => {
                const selected = answers[q.id] === o.value;
                return (
                  <label
                    key={o.value}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      selected
                        ? "border-[#CAFF00] bg-[#CAFF00]/10"
                        : "border-[#252525] bg-[#0A0A0A] hover:border-[#3a3a3a]"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={o.value}
                      checked={selected}
                      onChange={() => setAnswer(q.id, o.value)}
                      className="sr-only"
                    />
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
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* Datos de contacto */}
        <div className="flex flex-col gap-3 pt-2">
          <h3 className="font-bold text-white text-left">Tus datos para contactarte</h3>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            autoComplete="name"
            className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            aria-label="Tu email"
            autoComplete="email"
            className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
          />
          <input
            type="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu WhatsApp / teléfono"
            aria-label="Tu teléfono o WhatsApp"
            autoComplete="tel"
            className="rounded-xl border border-[#252525] bg-[#0A0A0A] px-4 py-3.5 text-sm text-white placeholder:text-[#666666] outline-none focus:border-[#CAFF00] transition-colors"
          />
        </div>

        {status === "error" && (
          <p role="alert" className="text-sm text-[#FF6B6B] text-center">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-brand text-base px-8 py-4 w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Enviando…" : "Enviar mi solicitud"}
        </button>
      </div>
    </form>
  );
}
