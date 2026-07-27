import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Hanken Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
        story: ["Merriweather", "Georgia", "serif"],
      },
      colors: {
        background: "#12131a",
        surface: "#1c1d28",
        "surface-dim": "#151620",
        "surface-bright": "#2a2b3a",
        "surface-container-lowest": "#12131a",
        "surface-container-low": "#1b1c27",
        "surface-container": "#222331",
        "surface-container-high": "#2a2b3a",
        "surface-container-highest": "#38394a",
        "on-surface": "#f0edf7",
        "on-surface-variant": "#a9a7b7",
        outline: "#a9a7b7",
        "outline-variant": "#3a3b4b",
        primary: "#a99cff",
        "on-primary": "#171428",
        "primary-container": "#37315f",
        "on-primary-container": "#ebe8ff",
        secondary: "#c6b9f9",
        "on-secondary": "#1a152d",
        "secondary-container": "#312949",
        "on-secondary-container": "#ece7ff",
        tertiary: "#e9d7b4",
        "on-tertiary": "#2a2112",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "text-primary": "#f0edf7",
        "text-secondary": "#a9a7b7",
        "border-subtle": "#2a2b3a",
      },
      boxShadow: {
        innerline: "inset 0 0 0 1px rgba(148, 137, 121, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
