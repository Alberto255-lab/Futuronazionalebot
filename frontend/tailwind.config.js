/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0a1628",
        navycard: "#152238",
        gold: "#FFD700",
        tgblue: "#29A9E0",
      },
    },
  },
  plugins: [],
};
