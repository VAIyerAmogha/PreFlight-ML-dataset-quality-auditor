/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152018",
        fern: "#2f6f4e",
        mint: "#d8f3dc",
        amberline: "#d1901f",
        coral: "#c94f4f",
        panel: "#fbfbf7"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(21, 32, 24, 0.09)"
      }
    }
  },
  plugins: []
};
