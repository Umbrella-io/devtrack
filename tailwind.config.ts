import plugin from "tailwindcss/plugin";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    plugin(function({ addBase }) {
      addBase({
        "*:focus": {
          outline: "none",
        },
        "*:focus-visible": {
          outline: "2px solid var(--accent)",
          outlineOffset: "2px",
        },
      });
    }),
  ],
};

export default config;
