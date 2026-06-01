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
        background: "#222831",
        surface: "#393E46",
        "surface-dim": "#1a1f26",
        "surface-bright": "#3d434c",
        "surface-container-lowest": "#1a1e25",
        "surface-container-low": "#2c323a",
        "surface-container": "#333a44",
        "surface-container-high": "#3d4550",
        "surface-container-highest": "#48505c",
        "on-surface": "#DFD0B8",
        "on-surface-variant": "#948979",
        outline: "#948979",
        "outline-variant": "#48505c",
        primary: "#DFD0B8",
        "on-primary": "#222831",
        "primary-container": "#948979",
        "on-primary-container": "#DFD0B8",
        secondary: "#948979",
        "on-secondary": "#222831",
        "secondary-container": "#3d434c",
        "on-secondary-container": "#DFD0B8",
        tertiary: "#DFD0B8",
        "on-tertiary": "#222831",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "text-primary": "#DFD0B8",
        "text-secondary": "#948979",
        "border-subtle": "#393E46",
      },
      boxShadow: {
        innerline: "inset 0 0 0 1px rgba(148, 137, 121, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
