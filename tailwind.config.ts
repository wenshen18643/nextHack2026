import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark editorial surface
        void: {
          DEFAULT: "#0a0a0a",
          soft: "#111111",
          lift: "#141414",
          hover: "#1a1a1a",
        },
        ink: {
          DEFAULT: "#171717",
          light: "#262626",
          lighter: "#404040",
        },
        // Warm neutral text
        milk: {
          DEFAULT: "#f5f5f5",
          dim: "#d4d4d4",
          muted: "#a3a3a3",
          faint: "#737373",
        },
        // Safety accent — used sparingly
        flame: {
          DEFAULT: "#f97316",
          deep: "#ea580c",
          glow: "#ffedd5",
          faint: "rgba(249, 115, 22, 0.1)",
        },
        // Functional
        danger: "#ef4444",
        success: "#22c55e",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      letterSpacing: {
        tighter: "-0.04em",
      },
    },
  },
  plugins: [],
};

export default config;
