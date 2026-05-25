"use client";

import { useState } from "react";

interface QuizStep {
  question: string;
  options: string[];
}

const STEPS: QuizStep[] = [
  {
    question: "¿Cuál es tu objetivo principal?",
    options: [
      "Perder peso y grasa",
      "Ganar músculo y fuerza",
      "Tonificarme y definirme",
      "Mejorar mi salud general",
    ],
  },
  {
    question: "¿Cuánto tiempo llevas intentándolo?",
    options: [
      "Acabo de empezar",
      "Menos de 6 meses",
      "6 meses – 2 años",
      "Más de 2 años",
    ],
  },
  {
    question: "¿Qué te ha frenado hasta ahora?",
    options: [
      "No sé qué comer ni cómo entrenar",
      "He probado dietas sin resultado",
      "Falta de tiempo o constancia",
      "No tengo apoyo ni seguimiento",
    ],
  },
];

const CALENDLY_URL = "https://calendly.com/infoelevatenutrition/15min";

export default function QuizSection() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  const isQuestionStep = step < STEPS.length;
  const currentStep = isQuestionStep ? STEPS[step] : null;
  const progress = Math.round(((step) / STEPS.length) * 100);

  function handleSelect(option: string) {
    setSelected(option);
  }

  function handleNext() {
    if (selected === null) return;
    setAnswers((prev) => ({ ...prev, [step]: selected }));
    setSelected(null);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
    setSelected(answers[step - 1] ?? null);
  }

  return (
    <section id="quiz" className="py-20 md:py-28">
      <div className="container-narrow">
        {/* Section label */}
        <div className="text-center mb-12">
          <span className="section-tag">Cuestionario</span>
          <h2 className="section-title mb-4">
            ¿Es este programa para ti?
          </h2>
          <p className="section-sub">
            Responde 3 preguntas rápidas y agenda tu llamada gratuita.
          </p>
        </div>

        <div
          className="rounded-2xl p-8 md:p-10"
          style={{ background: "#111111", border: "1px solid #252525" }}
        >
          {isQuestionStep ? (
            <>
              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-[#666666]">
                    Pregunta {step + 1} de {STEPS.length}
                  </span>
                  <span className="text-xs font-semibold text-[#CAFF00]">
                    {progress}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#252525] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: "#CAFF00" }}
                  />
                </div>
              </div>

              {/* Question */}
              <h3
                className="font-bold text-white mb-6 leading-snug"
                style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)" }}
              >
                {currentStep!.question}
              </h3>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {currentStep!.options.map((option) => {
                  const isActive = selected === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleSelect(option)}
                      className="text-left p-4 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer"
                      style={{
                        background: isActive ? "rgba(202,255,0,0.08)" : "#161616",
                        border: isActive ? "1px solid #CAFF00" : "1px solid #252525",
                        color: isActive ? "#CAFF00" : "#A0A0A0",
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full border mr-3 flex-shrink-0 text-xs font-bold"
                        style={{
                          borderColor: isActive ? "#CAFF00" : "#252525",
                          background: isActive ? "#CAFF00" : "transparent",
                          color: isActive ? "#0A0A0A" : "#666666",
                        }}
                      >
                        {isActive ? "✓" : ""}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="btn-outline text-sm px-5 py-3"
                  >
                    ← Volver
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={selected === null}
                  className="btn-brand text-sm px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {step < STEPS.length - 1 ? "Siguiente →" : "Ver mi resultado →"}
                </button>
              </div>
            </>
          ) : (
            /* Calendly step */
            <div>
              {/* Progress bar — complete */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-[#CAFF00]">¡Listo! Agenda tu llamada</span>
                  <span className="text-xs font-semibold text-[#CAFF00]">100%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#252525] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#CAFF00" }} />
                </div>
              </div>

              {/* Success message */}
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">🎯</div>
                <h3
                  className="font-black text-white mb-3"
                  style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}
                >
                  ¡Perfecto! Estás a un paso de transformar tu cuerpo
                </h3>
                <p className="text-[#A0A0A0] text-sm leading-relaxed max-w-md mx-auto">
                  Agenda tu llamada gratuita de 15 minutos. Te explicamos el programa,
                  resolvemos tus dudas y vemos si encaja contigo.
                </p>
              </div>

              {/* Calendly iframe */}
              <div
                className="rounded-xl overflow-hidden border border-[#252525]"
                style={{ minHeight: "660px" }}
              >
                <iframe
                  src={CALENDLY_URL}
                  width="100%"
                  height="660"
                  style={{ border: "none" }}
                  title="Agenda tu llamada"
                />
              </div>

              <button
                onClick={handleBack}
                className="mt-4 text-xs text-[#666666] hover:text-[#A0A0A0] transition-colors underline"
              >
                ← Volver a las preguntas
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
