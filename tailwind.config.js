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
          950: '#082f49', // Fundo Institucional Profundo
        },
        dark: {
          bg: '#0a0f1c',      // Fundo escuro principal
          card: '#111827',    // Superfície dos cards
          border: '#1e293b',
          text: '#f8fafc',
          muted: '#94a3b8',
        },
        light: {
          bg: '#f8fafc',      // Fundo claro principal
          card: '#ffffff',    // Cards brancos
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sora: ['Sora_400Regular'],
        'sora-semibold': ['Sora_600SemiBold'],
        'sora-bold': ['Sora_700Bold'],
        'sora-extrabold': ['Sora_800ExtraBold'],
      }
    },
  },
  plugins: [],
};
