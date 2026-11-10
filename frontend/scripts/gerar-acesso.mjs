// Gera a linha de acesso (hash SHA-256) para colar em src/acesso.js.
// Uso: node scripts/gerar-acesso.mjs admin MinhaSenhaNova
import { createHash } from "node:crypto";

const SAL = "verdona-demo-v1";
const [usuario, senha] = process.argv.slice(2);
if (!usuario || !senha) {
  console.error("Uso: node scripts/gerar-acesso.mjs <usuario> <senha>");
  process.exit(1);
}
const u = usuario.trim().toLowerCase();
const papel = u === "admin" ? "admin" : "implantador";
const hash = createHash("sha256").update(`${SAL}:${u}:${senha}`).digest("hex");
console.log(`  { usuario: "${u}", papel: "${papel}", hash: "${hash}" },`);
