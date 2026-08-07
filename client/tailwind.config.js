/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
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
