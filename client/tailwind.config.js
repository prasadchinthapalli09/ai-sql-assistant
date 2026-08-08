/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
        },
      },
      backgroundImage: {
        "glass-light": "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.3))",
        "glass-dark": "linear-gradient(135deg, rgba(30,30,46,0.7), rgba(30,30,46,0.3))",
      },
    },
  },
  plugins: [],
};
