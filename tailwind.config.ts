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
        brand: {
          DEFAULT: "#CAFF00",
          dark: "#A8D900",
          light: "#DEFF66",
          glow: "rgba(202,255,0,0.15)",
        },
        dark: {
          DEFAULT: "#0A0A0A",
          soft: "#111111",
          card: "#161616",
          border: "#252525",
        },
        light: {
          DEFAULT: "#FFFFFF",
          muted: "#A0A0A0",
          subtle: "#666666",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        narrow: "680px",
        content: "960px",
        wide: "1280px",
      },
      boxShadow: {
        "brand-glow": "0 0 40px rgba(202,255,0,0.2)",
        "brand-glow-lg": "0 0 80px rgba(202,255,0,0.3)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease forwards",
        "fade-in": "fadeIn 0.5s ease forwards",
        "pulse-brand": "pulseBrand 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pulseBrand: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(202,255,0,0.2)" },
          "50%": { boxShadow: "0 0 50px rgba(202,255,0,0.5)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
