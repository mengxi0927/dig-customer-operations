import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#172033", muted: "#667085", brand: { DEFAULT: "#2557d6", soft: "#edf3ff" } }, boxShadow: { panel: "0 1px 2px rgba(16,24,40,.04), 0 8px 28px rgba(16,24,40,.05)" } } },
  plugins: []
} satisfies Config;
