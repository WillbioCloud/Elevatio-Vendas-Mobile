/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#38bdf8',
          500: '#0ea5e9', // Azul Primário Oficial Elevatio
          600: '#0284c7', // Interação / Press
          700: '#0369a1',
          900: '#0c4a6e',
          950: '#082f49',
        },
        dark: {
          bg: '#09090b',          // Zinc 950
          card: '#121215',        // Zinc 900 custom surface
          mutedSurface: '#18181b',// Zinc 900
          border: '#27272a',      // Zinc 800
          text: '#f4f4f5',        // Zinc 100
          muted: '#a1a1aa',       // Zinc 400
        },
        light: {
          bg: '#fafafa',          // Zinc 50
          card: '#ffffff',        // White
          mutedSurface: '#f4f4f5',// Zinc 100
          border: '#e4e4e7',      // Zinc 200
          text: '#09090b',        // Zinc 950
          muted: '#71717a',       // Zinc 500
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
        }
      },
    },
  },
  plugins: [],
};
