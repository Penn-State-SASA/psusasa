import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'sasa-red': {
          900: '#590404',
          700: '#a10000',
          500: '#e30000',
          600: '#810220',
        },
        'sasa-gold': {
          600: '#cda563',
          400: '#ffd37e',
        },
        'sasa-sage': '#d9dfa5',
        'sasa-forest': '#0f5444',
        'sasa-neutral': {
          400: '#a2aaad',
          500: '#7b7171',
        },
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'Arial', 'sans-serif'],
      },
      keyframes: {
        // Door scanner: a full-screen wash of the result's colour that fades
        // out, so back-to-back scans are unmistakable at a glance.
        'scan-flash': {
          '0%': { opacity: '0.75' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'scan-flash': 'scan-flash 700ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
