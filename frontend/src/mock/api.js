// Roteador que imita a API REST do backend Java, chamando o motor do navegador.
import { RegraDeNegocio } from "./engine.js";

const copia = (x) => JSON.parse(JSON.stringify(x));

function exigir(corpo, campo, tipo) {
  const v = corpo?.[campo];
  const ok = tipo === "texto" ? typeof v === "string" && v.trim() !== "" : typeof v === "number" && v > 0;
  if (!ok) throw new RegraDeNegocio("PEDIDO_INVALIDO", `Confira o campo '${campo}'.`);
  return v;
}

export function criarApiMock(motor, { atrasoMs = 70 } = {}) {
  return async function apiMock(path, { method = "GET", body } = {}) {
    if (atrasoMs > 0) await new Promise((r) => setTimeout(r, atrasoMs * (0.4 + Math.random() * 0.8)));
    const caminho = path.split("?")[0];
    let m;
    const rota = (metodo, regex) => method === metodo && (m = caminho.match(regex));

    if (rota("GET", /^\/cadastros$/)) return copia(motor.cadastros());
    if (rota("GET", /^\/carteiras\/([\w-]+)$/)) return copia(motor.carteira(m[1]));
    if (rota("GET", /^\/painel$/)) return copia(motor.painel());
    if (rota("GET", /^\/cobrancas$/)) return copia(motor.todasCobrancas());
    if (rota("GET", /^\/pesagens$/)) return copia(motor.pesagensRecentes(10));
    if (rota("GET", /^\/conciliacao$/)) return copia(motor.conciliar());

    if (rota("POST", /^\/pesagens$/)) {
      exigir(body, "titularId", "texto");
      exigir(body, "coletorId", "texto");
      exigir(body, "material", "texto");
      exigir(body, "qualidade", "texto");
      exigir(body, "kg", "numero");
      return copia(motor.registrarPesagem(body));
    }
    if (rota("POST", /^\/pesagens\/([\w-]+)\/recepcao$/)) {
      exigir(body, "kg", "numero");
      return copia(motor.registrarRecepcao(m[1], body.kg));
    }
    if (rota("POST", /^\/cobrancas$/)) {
      exigir(body, "comercioId", "texto");
      exigir(body, "valorCentavos", "numero");
      return copia(motor.criarCobranca(body.comercioId, body.valorCentavos));
    }
    if (rota("POST", /^\/cobrancas\/([\w-]+)\/confirmar$/)) {
      exigir(body, "perfilId", "texto");
      return copia(motor.confirmarCobranca(m[1], body.perfilId));
    }
    if (rota("POST", /^\/liquidacoes\/fechar-dia$/)) return copia(motor.fecharDia());
    if (rota("POST", /^\/demo\/reiniciar$/)) {
      motor.reiniciar();
      return { ok: true };
    }
    if (rota("POST", /^\/demo\/divergencia$/)) {
      motor.injetarDivergencia();
      return copia(motor.conciliar());
    }
    throw Object.assign(new Error("Recurso não encontrado."), { codigo: "NAO_ENCONTRADO" });
  };
}
