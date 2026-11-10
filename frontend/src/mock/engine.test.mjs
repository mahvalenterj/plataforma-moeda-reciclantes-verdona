// Testes do motor do navegador. Rodar: npm test  (usa o executor de testes do próprio Node, sem dependências).
import test from "node:test";
import assert from "node:assert/strict";
import { criarMotor, FUNDO_INICIAL_CENTAVOS } from "./engine.js";
import { criarApiMock } from "./api.js";

const novo = () => {
  const motor = criarMotor();
  const api = criarApiMock(motor, { atrasoMs: 0 });
  return { motor, api };
};
const pesar = (api, extra = {}) =>
  api("/pesagens", { method: "POST", body: { titularId: "dona-maria", coletorId: "marcos", material: "PET", qualidade: "LIMPO", kg: 14, chave: "k1", ...extra } });
const rejeita = async (promessa, codigo, trecho) => {
  await assert.rejects(promessa, (e) => {
    assert.equal(e.codigo, codigo);
    if (trecho) assert.match(e.message, trecho);
    return true;
  });
};

test("fluxo da Dona Maria: pesa, cobra, neta paga, fecha o dia e concilia", async () => {
  const { api } = novo();
  const pes = await pesar(api);
  assert.equal(pes.creditoCentavos, 3500);
  assert.equal(pes.nota10, true);
  let cart = await api("/carteiras/dona-maria");
  assert.equal(cart.saldoCentavos, 3500);
  const cob = await api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo", valorCentavos: 3500 } });
  const paga = await api(`/cobrancas/${cob.id}/confirmar`, { method: "POST", body: { perfilId: "dona-maria" } });
  assert.equal(paga.status, "PAGA");
  cart = await api("/carteiras/dona-maria");
  assert.equal(cart.saldoCentavos, 0);
  const liqs = await api("/liquidacoes/fechar-dia", { method: "POST" });
  assert.equal(liqs.length, 2); // Seu Osvaldo e a Padaria Estrela (compra do histórico)
  const conc = await api("/conciliacao");
  assert.equal(conc.ok, true);
  assert.equal(conc.divergencias, 0);
});

test("a mesma chave de pesagem não credita duas vezes", async () => {
  const { api } = novo();
  const a = await pesar(api);
  const b = await pesar(api);
  assert.equal(a.id, b.id);
  assert.equal((await api("/carteiras/dona-maria")).saldoCentavos, 3500);
});

test("perfil delegado respeita o limite por compra, com a mensagem do documento de copy", async () => {
  const { api } = novo();
  await pesar(api, { kg: 30, chave: "k2" }); // 75,00
  const cob = await api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo", valorCentavos: 7000 } });
  await rejeita(api(`/cobrancas/${cob.id}/confirmar`, { method: "POST", body: { perfilId: "julia" } }), "LIMITE_COMPRA", /Peça à titular/);
});

test("material contaminado não gera crédito e orienta a pessoa", async () => {
  const { api } = novo();
  const p = await pesar(api, { qualidade: "CONTAMINADO", chave: "k3" });
  assert.equal(p.status, "REJEITADA");
  assert.equal(p.creditoCentavos, 0);
  assert.equal(p.nota10, false);
  assert.match(p.orientacao, /Enxágue, escorra e guarde coberto/);
  assert.equal((await api("/carteiras/dona-maria")).saldoCentavos, 0);
});

test("recepção com peso menor gera ajuste e o fundo cobre o que já foi gasto", async () => {
  const { api } = novo();
  const p = await pesar(api); // 35,00
  const cob = await api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo", valorCentavos: 3500 } });
  await api(`/cobrancas/${cob.id}/confirmar`, { method: "POST", body: { perfilId: "dona-maria" } });
  const r = await api(`/pesagens/${p.id}/recepcao`, { method: "POST", body: { kg: 10 } });
  assert.equal(r.status, "AJUSTADA");
  assert.equal(r.ajusteCentavos, 0); // a carteira estava zerada: tudo é absorvido pelo fundo
  assert.match(r.orientacao, /O fundo cobriu/);
  assert.equal((await api("/conciliacao")).ok, true);
});

test("sem saldo não paga, e a mensagem diz o saldo e a compra", async () => {
  const { api } = novo();
  const cob = await api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo", valorCentavos: 3500 } });
  await rejeita(api(`/cobrancas/${cob.id}/confirmar`, { method: "POST", body: { perfilId: "dona-maria" } }), "SALDO_INSUFICIENTE", /Peça ao comércio/);
});

test("Nota 10 e meta do bairro aparecem no painel", async () => {
  const { api } = novo();
  let painel = await api("/painel");
  assert.equal(painel.metaBairro.atingida, false);
  await pesar(api);
  painel = await api("/painel");
  assert.equal(painel.metaBairro.atingida, true);
  assert.ok(painel.ranking.some((r) => r.titularId === "dona-maria" && r.notas10 === 1));
});

test("a conciliação detecta divergência no extrato do parceiro", async () => {
  const { api } = novo();
  await rejeita(api("/demo/divergencia", { method: "POST" }), "SEM_LIQUIDACAO");
  await api("/liquidacoes/fechar-dia", { method: "POST" });
  const conc = await api("/demo/divergencia", { method: "POST" });
  assert.equal(conc.ok, false);
  assert.equal(conc.divergencias, 1);
});

test("comércio em validação não cobra", async () => {
  const { api } = novo();
  await rejeita(api("/cobrancas", { method: "POST", body: { comercioId: "emporio-da-tia-lu", valorCentavos: 1000 } }), "COMERCIO_NAO_ATIVO", /não aceita a verdona/);
});

test("peso fora do limite é recusado com a mensagem do documento de copy", async () => {
  const { api } = novo();
  await rejeita(pesar(api, { kg: 500, chave: "k9" }), "PESO_INVALIDO", /entre 0,1 e 80 kg por parada/);
});

test("pedido sem campo obrigatório é recusado", async () => {
  const { api } = novo();
  await rejeita(api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo" } }), "PEDIDO_INVALIDO", /valorCentavos/);
});

test("ledger: dupla entrada, soma constante e saldo nunca negativo", async () => {
  const { api, motor } = novo();
  await pesar(api);
  const cob = await api("/cobrancas", { method: "POST", body: { comercioId: "seu-osvaldo", valorCentavos: 3500 } });
  await api(`/cobrancas/${cob.id}/confirmar`, { method: "POST", body: { perfilId: "dona-maria" } });
  await api("/liquidacoes/fechar-dia", { method: "POST" });
  assert.equal(motor.invariantesOk(), true);
  assert.equal((await api("/painel")).invariantesOk, true);
});

test("reiniciar volta ao estado inicial e o fundo volta ao valor de exemplo", async () => {
  const { api } = novo();
  await pesar(api);
  await api("/demo/reiniciar", { method: "POST" });
  const painel = await api("/painel");
  assert.equal(painel.push.total, 0);
  assert.equal((await api("/carteiras/dona-maria")).saldoCentavos, 0);
  assert.ok(painel.emissaoDisponivelCentavos <= FUNDO_INICIAL_CENTAVOS);
  assert.equal((await api("/liquidacoes/fechar-dia", { method: "POST" })).length, 1); // só a compra do histórico
});

test("eventos: o fluxo publica transação, pesagem e push, e o reinício silencia a semeadura", async () => {
  const { api, motor } = novo();
  const vistos = [];
  const s = motor.assinar();
  ["transacao", "pesagem", "push", "reiniciado"].forEach((t) => s.addEventListener(t, () => vistos.push(t)));
  await pesar(api);
  assert.deepEqual([...new Set(vistos)].sort(), ["pesagem", "push", "transacao"]);
  vistos.length = 0;
  await api("/demo/reiniciar", { method: "POST" });
  assert.deepEqual(vistos, ["reiniciado"]);
  s.close();
});
