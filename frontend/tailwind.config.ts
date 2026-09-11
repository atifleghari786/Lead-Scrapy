import type { Config } from "tailwindcss";

// Palette: a data-tool aesthetic (this is a scraping/extraction console, not a
// marketing-cute SaaS) — deep ink background for the app shell, a signal
// amber for running/live states, slate surfaces, and a cool teal for
// completed/success states. Deliberately avoids the generic
// cream+terracotta or SaaS-card+shadow defaults.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E11",
          900: "#12161B",
          800: "#1A2029",
          700: "#242C38",
          600: "#333D4D",
        },
        paper: {
          50: "#F7F8FA",
          100: "#ECEEF1",
          400: "#8992A0",
        },
        signal: {
          amber: "#E8A33D",
          teal: "#3FA79A",
          teal600: "#2C8377",
          red: "#D8604A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 14, 17, 0.04), 0 8px 24px -12px rgba(11, 14, 17, 0.12)",
        lift: "0 2px 4px rgba(11,14,17,0.05), 0 12px 28px rgba(11,14,17,0.09)",
      },
    },
  },
  plugins: [],
};

export default config;
