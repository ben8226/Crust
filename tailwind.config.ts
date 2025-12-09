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
        tan: {
          50: "#faf8f3",
          100: "#f5f1e8",
          200: "#e8ddd4",
        },
        brown: {
          DEFAULT: "#723f18",
          500: "#723f18",
          600: "#723f18",
          700: "#5a3213",
        },
      },
      fontFamily: {
        sans: ['"Garet"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;


