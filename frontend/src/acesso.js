// Acesso ao painel de gestão na versão de teste (sem servidor).
// ATENÇÃO: isto é só uma barreira de demonstração. Sem backend, a verificação roda no navegador e pode ser contornada.
// Ela não protege dados reais. Para proteger de verdade, o acesso tem de ser validado no servidor.
//
// Guardamos só o hash (SHA-256) das senhas, nunca a senha em texto. Para trocar uma senha:
//   node scripts/gerar-acesso.mjs admin NOVA_SENHA   e cole a linha gerada abaixo.

const SAL = "verdona-demo-v1";
const CHAVE_SESSAO = "verdona.sessao";

export const ACESSOS = [
  { usuario: "admin", papel: "admin", hash: "d2b6c998c5e85414fe5c4a50c9543ec1d4f9795020618385a9890c05f8e1024f" },
  { usuario: "implantador", papel: "implantador", hash: "cfc7ac304e5166d6d4612439dc488913fab800baa3c244614b2a23541408bd7f" },
];

export const ROTULO_PAPEL = { admin: "admin", implantador: "implantador" };

async function sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Devolve { usuario, papel } se o usuário e a senha conferem, senão null. */
export async function entrar(usuario, senha) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Este navegador não permite a verificação. Abra o endereço com https.");
  }
  const u = usuario.trim().toLowerCase();
  const hash = await sha256(`${SAL}:${u}:${senha}`);
  const achado = ACESSOS.find((a) => a.usuario === u && a.hash === hash);
  if (!achado) return null;
  const sessao = { usuario: achado.usuario, papel: achado.papel };
  try {
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    /* sem armazenamento: a sessão vale só até recarregar */
  }
  return sessao;
}

export function lerSessao() {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO));
    return s && ACESSOS.some((a) => a.usuario === s.usuario && a.papel === s.papel) ? s : null;
  } catch {
    return null;
  }
}

export function sair() {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* nada a limpar */
  }
}
