/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // fundo "noite" da coruja
        ink: {
          950: "#05080F",
          900: "#090E17",
          800: "#0F1623",
          700: "#151E2E",
          600: "#1D2940",
          500: "#2A3853",
          400: "#44526F",
        },
        // texto
        mist: {
          400: "#627089",
          300: "#8694AD",
          200: "#B3BFD3",
          100: "#DCE4F0",
          50: "#F1F5FB",
        },
        // cor de destaque: o brilho do olho da coruja
        owl: {
          300: "#7BE7FA",
          400: "#3DD8F2",
          500: "#1EC2E8",
          600: "#0EA3C9",
        },
        // cores semânticas e das categorias (as 5 primeiras já existiam no banco)
        signal: {
          blue: "#4C8DFF",
          teal: "#22B8A6",
          amber: "#F0A93E",
          rose: "#F0627A",
          violet: "#9484F2",
          lime: "#9BD14B",
          orange: "#F2864B",
          pink: "#E873C8",
          green: "#3DD68C",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
