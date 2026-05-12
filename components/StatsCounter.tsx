"use client";

import { useEffect, useRef, useState } from "react";

interface Props { value: number; suffix?: string; decimals?: number; }

export default function StatsCounter({ value, suffix = "", decimals = 0 }: Props) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800, steps = 60;
          let step = 0;
          const timer = setInterval(() => {
            step++;
            const eased = 1 - Math.pow(1 - step / steps, 3);
            setCount(parseFloat((value * eased).toFixed(decimals)));
            if (step >= steps) { clearInterval(timer); setCount(value); }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, decimals]);

  return <span ref={ref}>{decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString("es-ES")}{suffix}</span>;
}
