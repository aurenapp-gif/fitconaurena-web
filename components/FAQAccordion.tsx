"use client";

import { useState } from "react";

interface FAQ { q: string; a: string; }
interface Props { faqs: FAQ[]; }

export default function FAQAccordion({ faqs }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col divide-y" style={{ borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}>
      {faqs.map((faq, i) => (
        <div key={i} className="py-1">
          <button className="w-full flex items-center justify-between gap-4 py-5 text-left transition-colors" onClick={() => setOpen(open === i ? null : i)}>
            <span className="font-semibold text-ink text-sm sm:text-base leading-snug pr-4">{faq.q}</span>
            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200" style={{ background: open === i ? "rgba(34,197,94,0.12)" : "#F3F4F6", color: open === i ? "#16A34A" : "#6B7280", transform: open === i ? "rotate(180deg)" : "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
          <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open === i ? "400px" : "0px" }}>
            <p className="text-sm text-ink-muted leading-relaxed pb-5">{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
