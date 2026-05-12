import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        pink: {
          primary: "#F472B6",
          dark: "#EC4899",
          light: "#FBCFE8",
          glow: "#F472B633",
        },
        amber: {
          primary: "#F59E0B",
          dark: "#D97706",
          light: "#FCD34D",
        },
        ink: {
          DEFAULT: "#0D1117",
          soft: "#1C2128",
          muted: "#6B7280",
        },
        cream: {
          DEFAULT: "#FAFAF8",
          warm: "#FDF2F8",
          dark: "#FCE7F3",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          raised: "#FDF2F8",
          overlay: "#1C2128",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        narrow: "680px",
        content: "960px",
        wide: "1280px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
        "pink-glow": "0 0 40px rgba(244,114,182,0.25)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "pulse-pink": "pulsePink 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulsePink: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(244,114,182,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(244,114,182,0.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
