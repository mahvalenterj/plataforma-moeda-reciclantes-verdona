/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        folha: "#F5F3EA",
        papel: "#FBFAF5",
        mata: "#2E7A3A",
        mataescura: "#235F2D",
        floresta: "#0B2A1B",
        hortela: "#E3F0DF",
        tutu: "#8FD07B",
        moeda: "#C07A3A",
        tinta: "#14281C",
        suave: "#5B6B60",
        linha: "#DCDFD0",
        erro: "#B3402F",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        body: ['"Figtree Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 18px 40px -18px rgba(11,42,27,.35), 0 2px 6px rgba(11,42,27,.08)",
        suave: "0 10px 30px -16px rgba(11,42,27,.28)",
      },
    },
  },
  plugins: [],
};
