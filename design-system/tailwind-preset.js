/** Preset do Tailwind ligado às variáveis CSS do design system.
 *  Uso no tailwind.config.js: presets: [require("./design-system/tailwind-preset.js")] */
const cor = (nome) => `var(--cor-${nome})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        superficie: { DEFAULT: cor("superficie"), elevada: cor("superficie-elevada"), forte: cor("superficie-forte"), destaque: cor("superficie-destaque") },
        texto: { DEFAULT: cor("texto"), suave: cor("texto-suave"), invertido: cor("texto-invertido") },
        acao: { DEFAULT: cor("acao"), hover: cor("acao-hover") },
        acento: { DEFAULT: cor("acento"), texto: cor("acento-texto"), fundo: cor("acento-fundo") },
        borda: cor("borda"),
        sucesso: { DEFAULT: cor("sucesso"), fundo: cor("sucesso-fundo") },
        erro: { DEFAULT: cor("erro"), fundo: cor("erro-fundo") },
      },
      fontFamily: { display: "var(--fonte-display)", texto: "var(--fonte-texto)" },
      borderRadius: { sm: "var(--raio-sm)", md: "var(--raio-md)", lg: "var(--raio-lg)", xl: "var(--raio-xl)", pilula: "var(--raio-pilula)" },
      boxShadow: { suave: "var(--sombra-suave)", elevada: "var(--sombra-elevada)" },
      minHeight: { toque: "var(--toque-minimo)" },
      minWidth: { toque: "var(--toque-minimo)" },
      transitionDuration: { rapido: "var(--mov-rapido)", padrao: "var(--mov-padrao)", lento: "var(--mov-lento)" },
    },
  },
};
