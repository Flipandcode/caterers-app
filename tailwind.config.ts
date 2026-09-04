import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--color-bg))",
        surface: "hsl(var(--color-surface))",
        ink: "hsl(var(--color-ink))",
        marigold: "hsl(var(--color-marigold))",
        green: "hsl(var(--color-green))",
        tamarind: "hsl(var(--color-tamarind))",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        lg: "1rem",
        md: "0.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
