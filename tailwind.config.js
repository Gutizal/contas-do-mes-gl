/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080D18",
          900: "#0B1220",
          800: "#111A2E",
          700: "#182238",
          600: "#212D48",
          500: "#2A3655",
          400: "#455073",
        },
        mist: {
          300: "#8B96B3",
          200: "#B4BDD6",
          100: "#DDE3F2",
          50: "#EEF1F9",
        },
        signal: {
          blue: "#3E7BFA",
          teal: "#22B8A6",
          amber: "#E8A33D",
          rose: "#E85D75",
          violet: "#8C7CF0",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
}

