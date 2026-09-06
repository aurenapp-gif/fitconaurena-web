import type { Config } from "tailwindcss";

/**
 * Colores como TOKENS, no como hex sueltos.
 *
 * Cada nombre dice para qué sirve (`surface`, `ink-muted`, `line`) y su valor
 * real vive en una variable CSS de app/globals.css. Así el tema entero cabe en
 * un bloque, y cambiarlo —o añadir un modo oscuro— no obliga a tocar las
 * ochenta pantallas que lo usan.
 *
 * La forma `rgb(var(--x) / <alpha-value>)` es lo que permite escribir
 * `bg-brand/10` o `border-line/50`: Tailwind sustituye <alpha-value> por la
 * opacidad pedida. Con un hex fijo no funcionaría con variables.
 */
const t = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Superficies, de fondo a primer plano.
        page: t("--c-page"),
        surface: t("--c-surface"),
        "surface-2": t("--c-surface-2"),
        // Bordes y separadores.
        line: t("--c-line"),
        "line-strong": t("--c-line-strong"),
        // Texto, de más a menos presente.
        ink: t("--c-ink"),
        "ink-muted": t("--c-ink-muted"),
        "ink-subtle": t("--c-ink-subtle"),
        // Marca y estados.
        brand: {
          DEFAULT: t("--c-brand"),
          dark: t("--c-brand-dark"),
          soft: t("--c-brand-soft"),
        },
        danger: { DEFAULT: t("--c-danger"), soft: t("--c-danger-soft") },
        warn: { DEFAULT: t("--c-warn"), soft: t("--c-warn-soft") },
        success: { DEFAULT: t("--c-success"), soft: t("--c-success-soft") },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      maxWidth: {
        narrow: "680px",
        content: "960px",
        wide: "1280px",
      },
      boxShadow: {
        // Sombra suave para tarjetas elevadas (hojas, menús). Las tarjetas
        // normales van con borde, no con sombra.
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.08)",
        // Realce del botón de marca al pasar por encima.
        "brand-glow": "0 8px 24px rgba(28, 160, 227, 0.28)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
