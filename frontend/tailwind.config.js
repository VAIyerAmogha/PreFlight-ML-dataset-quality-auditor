/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f4f7ff",
        fern: "#4f8cff",
        mint: "#dbeafe",
        amberline: "#7aa7ff",
        coral: "#fb7185",
        panel: "#07111f"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(3, 8, 20, 0.45)",
        glow: "0 0 0 1px rgba(79, 140, 255, 0.18), 0 18px 70px rgba(79, 140, 255, 0.16)"
      }
    }
  },
  plugins: []
};
