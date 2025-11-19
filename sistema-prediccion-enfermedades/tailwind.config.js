/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#F97316",
        "primary-dark": "#EA580C", 
        "secondary": "#64748B",
        "accent": "#0F172A",
        "background-light": "#F8FAFC",
        "background-dark": "#0F172A",
        "text-main": "#171717",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
}