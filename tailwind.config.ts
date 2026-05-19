import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        paper: "#f6f7f5",
        panel: "#ffffff",
        line: "#d8ded9",
        muted: "#65706a",
        accent: "#8c3f4d",
        forest: "#2f5d50",
        amber: "#bd7a32",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(32, 24, 18, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
