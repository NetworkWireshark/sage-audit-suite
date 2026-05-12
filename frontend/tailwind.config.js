/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        panel: "#121a2b",
        panelSoft: "#172338",
        line: "#24324a",
        aqua: "#2dd4bf",
        amber: "#f59e0b",
        coral: "#fb7185",
        steel: "#94a3b8"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(0,0,0,0.28)"
      }
    }
  },
  plugins: []
};
