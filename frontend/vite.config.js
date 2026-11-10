import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" deixa os arquivos com caminho relativo: funciona em qualquer endereço,
// inclusive em https://<usuario>.github.io/<repositorio>/ (GitHub Pages) e na Vercel.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } },
  },
  preview: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } },
  },
});
