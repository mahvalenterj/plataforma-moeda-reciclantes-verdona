// Motor da demonstração no navegador.
// Porta fiel do backend Java (mesmo ledger de dupla entrada, mesmas regras e mensagens), sem servidor.
// Serve para testar online (GitHub Pages, Vercel). O backend Java segue na pasta backend/ para o piloto real.

export const FUNDO_ID = "fundo:patrocinador-demo";
export const PARCEIRO_ID = "parceiro:pix";
export const FUNDO_INICIAL_CENTAVOS = 500_000; // R$ 5.000,00 de patrocínio (exemplo)
export const LIMITE_PARADA_CENTAVOS = 20_000;
export const LIMITE_DIA_CENTAVOS = 30_000;
export const KG_MAXIMO = 80;
const VALOR_MAXIMO_CENTAVOS = 100_000;
const META_BAIRRO_KG = 75;
const PREMIO_META = "kit de leitura para a creche do bairro (exemplo)";

export const carteiraId = (titularId) => `carteira:${titularId}`;
export const aPagarId = (comercioId) => `apagar:${comercioId}`;

export const MATERIAIS = {
  PET: { rotulo: "PET", centavosPorKg: 250 },
  ALUMINIO: { rotulo: "Alumínio", centavosPorKg: 800 },
  PAPEL: { rotulo: "Papel e papelão", centavosPorKg: 50 },
  VIDRO: { rotulo: "Vidro", centavosPorKg: 30 },
};
export const QUALIDADES = {
  LIMPO: { rotulo: "Limpo", fator: 1.0 },
  ACEITAVEL: { rotulo: "Aceitável", fator: 0.8 },
  CONTAMINADO: { rotulo: "Contaminado", fator: 0.0 },
};

export class RegraDeNegocio extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.codigo = codigo;
  }
}

// ---------- formatação (igual ao Formato.java) ----------
const reaisTxt = (c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kgTxt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const verdonasTxt = (c) => `${c % 100 === 0 ? String(c / 100) : reaisTxt(c)} ${c === 100 ? "verdona" : "verdonas"}`;
const diaSP = (d) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const agoraMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const iso = () => new Date().toISOString();
const copia = (x) => JSON.parse(JSON.stringify(x));

export function criarMotor() {
  // ---------- eventos (substitui o SSE) ----------
  const streams = new Set();
  let silencioso = false;
  function publicar(tipo, dados) {
    if (silencioso) return;
    const texto = JSON.stringify(dados);
    streams.forEach((s) => (s.ouvintes.get(tipo) || []).forEach((fn) => fn({ data: texto })));
  }
  function assinar() {
    const s = {
      ouvintes: new Map(),
      onerror: null,
      addEventListener(tipo, fn) {
        if (!s.ouvintes.has(tipo)) s.ouvintes.set(tipo, []);
        s.ouvintes.get(tipo).push(fn);
      },
      close() {
        streams.delete(s);
      },
    };
    streams.add(s);
    setTimeout(() => (s.ouvintes.get("ola") || []).forEach((fn) => fn({ data: '{"ok":true}' })), 0);
    return s;
  }

  // ---------- cadastros ----------
  const participantes = new Map();
  const comercios = new Map();
  const coletores = new Map();
  const titular = (id, nome) =>
    participantes.set(id, { id, nome, tipo: "TITULAR", titularId: null, limiteCompraCentavos: 0, limiteDiaCentavos: 0, bairro: "Quintino" });
  const comercio = (id, nome, status) => comercios.set(id, { id, nome, bairro: "Quintino", status });
  titular("dona-maria", "Dona Maria");
  participantes.set("julia", { id: "julia", nome: "Júlia (neta)", tipo: "DELEGADO", titularId: "dona-maria", limiteCompraCentavos: 6_000, limiteDiaCentavos: 10_000, bairro: "Quintino" });
  titular("seu-jorge", "Seu Jorge");
  titular("dona-neide", "Dona Neide");
  titular("familia-souza", "Família Souza");
  titular("joana-lima", "Joana Lima");
  comercio("seu-osvaldo", "Mercearia do Seu Osvaldo", "ATIVO");
  comercio("padaria-estrela", "Padaria Estrela", "ATIVO");
  comercio("sacolao-da-vila", "Sacolão da Vila", "ATIVO");
  comercio("acougue-bom-preco", "Açougue Bom Preço", "ATIVO");
  comercio("emporio-da-tia-lu", "Empório da Tia Lu", "EM_VALIDACAO");
  coletores.set("marcos", { id: "marcos", nome: "Marcos", operador: "Cooperativa Recicla Quintino (exemplo)", rota: "Rota Quintino Sul" });

  const obter = (mapa, id, codigo, texto) => {
    const v = mapa.get(id);
    if (!v) throw new RegraDeNegocio(codigo, `${texto}: ${id}`);
    return v;
  };
  const participante = (id) => obter(participantes, id, "PARTICIPANTE_INEXISTENTE", "Participante não encontrado");
  const comercioPorId = (id) => obter(comercios, id, "COMERCIO_INEXISTENTE", "Comércio não encontrado");
  const coletor = (id) => obter(coletores, id, "COLETOR_INEXISTENTE", "Coletor não encontrado");
  const titulares = () => [...participantes.values()].filter((p) => p.tipo === "TITULAR");
  const perfisDoTitular = (id) => [...participantes.values()].filter((p) => p.id === id || p.titularId === id);

  // ---------- ledger (dupla entrada, imutável, idempotente) ----------
  let contas, saldos, livro, transacoes, porChave, porId, seqLedger, totalInicial;
  const ouvintesLedger = [];
  function ledgerReiniciar() {
    contas = new Map();
    saldos = new Map();
    livro = [];
    transacoes = [];
    porChave = new Map();
    porId = new Map();
    seqLedger = 0;
    totalInicial = 0;
  }
  function abrirConta(conta, saldoInicial) {
    contas.set(conta.id, conta);
    saldos.set(conta.id, saldoInicial);
    totalInicial += saldoInicial;
  }
  function transferir(chave, tipo, memo, de, para, centavos) {
    if (!(centavos > 0)) throw new RegraDeNegocio("VALOR_INVALIDO", "O valor precisa ser maior que zero.");
    if (chave != null && porChave.has(chave)) {
      const e = porChave.get(chave);
      const igual = e.tipo === tipo && e.de === de && e.para === para && e.centavos === centavos;
      if (!igual) throw new RegraDeNegocio("CHAVE_REUTILIZADA", "Essa chave de idempotência já foi usada em outra operação.");
      return { transacao: e, repetida: true };
    }
    const contaDe = contas.get(de);
    const contaPara = contas.get(para);
    if (!contaDe || !contaPara) throw new RegraDeNegocio("CONTA_INEXISTENTE", "Conta inexistente na operação.");
    if (de === para) throw new RegraDeNegocio("CONTAS_IGUAIS", "Origem e destino não podem ser a mesma conta.");
    if (!contaDe.permiteNegativo && saldos.get(de) < centavos) {
      throw new RegraDeNegocio("SALDO_INSUFICIENTE", `Saldo insuficiente em ${contaDe.nome}.`);
    }
    const em = iso();
    const id = `tx_${String(transacoes.length + 1).padStart(6, "0")}`;
    const deb = { seq: ++seqLedger, transacaoId: id, contaId: de, sentido: "DEBITO", centavos, em };
    const cred = { seq: ++seqLedger, transacaoId: id, contaId: para, sentido: "CREDITO", centavos, em };
    saldos.set(de, saldos.get(de) - centavos);
    saldos.set(para, saldos.get(para) + centavos);
    livro.push(deb, cred);
    const tx = { id, chave, tipo, memo, de, para, centavos, em, origem: agoraMs(), lancamentos: [deb, cred] };
    transacoes.push(tx);
    porId.set(id, tx);
    if (chave != null) porChave.set(chave, tx);
    ouvintesLedger.forEach((o) => o(tx));
    return { transacao: tx, repetida: false };
  }
  function saldo(contaId) {
    if (!saldos.has(contaId)) throw new RegraDeNegocio("CONTA_INEXISTENTE", `Conta inexistente: ${contaId}`);
    return saldos.get(contaId);
  }
  function extrato(contaId, limite) {
    const saida = [];
    for (let i = livro.length - 1; i >= 0 && saida.length < limite; i--) if (livro[i].contaId === contaId) saida.push(livro[i]);
    return saida;
  }
  const ultimasTransacoes = (n) => transacoes.slice(Math.max(0, transacoes.length - n)).reverse();
  function invariantesOk() {
    const soma = [...saldos.values()].reduce((a, b) => a + b, 0);
    const debitos = livro.filter((l) => l.sentido === "DEBITO").reduce((a, l) => a + l.centavos, 0);
    const creditos = livro.filter((l) => l.sentido === "CREDITO").reduce((a, l) => a + l.centavos, 0);
    const semNegativoIndevido = [...saldos.entries()].every(([id, v]) => contas.get(id).permiteNegativo || v >= 0);
    return soma === totalInicial && debitos === creditos && semNegativoIndevido;
  }

  // ---------- notificações (push simulado) ----------
  let pushTotal = 0, pushSoma = 0, pushMax = 0;
  function notificar(destinatarios, titulo, corpo, origem) {
    const ms = Math.max(0.1, agoraMs() - origem); // abaixo de 0,1 ms é ruído de medição
    pushTotal++;
    pushSoma += ms;
    pushMax = Math.max(pushMax, ms);
    publicar("push", { destinatarios: [...destinatarios], titulo, corpo, latenciaMs: Math.round(ms * 10) / 10 });
  }
  const pushEstatisticas = () => ({
    total: pushTotal,
    mediaMs: pushTotal === 0 ? 0 : Math.round((pushSoma / pushTotal) * 10) / 10,
    maximaMs: Math.round(pushMax * 10) / 10,
  });
  const pushReiniciar = () => {
    pushTotal = 0;
    pushSoma = 0;
    pushMax = 0;
  };

  // ---------- coleta ----------
  const pesagens = new Map();
  const pesagemPorChave = new Map();
  let seqPesagem = 0;
  const comNota10 = (p) => ({ ...p, nota10: p.status !== "REJEITADA" && p.qualidade === "LIMPO" });
  const credito = (material, qualidade, kg) =>
    Math.floor(kg * MATERIAIS[material].centavosPorKg * QUALIDADES[qualidade].fator + 1e-9);
  function guardarPesagem(chave, p) {
    pesagens.set(p.id, p);
    if (chave != null) pesagemPorChave.set(chave, p.id);
  }
  function creditadoHoje(titularId) {
    const hoje = diaSP(new Date());
    return [...pesagens.values()]
      .filter((p) => p.titularId === titularId && p.status !== "REJEITADA" && diaSP(new Date(p.em)) === hoje)
      .reduce((a, p) => a + p.creditoCentavos, 0);
  }
  function registrarPesagem(p) {
    if (p.chave != null && pesagemPorChave.has(p.chave)) return pesagens.get(pesagemPorChave.get(p.chave));
    const t = participante(p.titularId);
    if (t.tipo !== "TITULAR") throw new RegraDeNegocio("TITULAR_INVALIDO", "A pesagem é registrada na conta do titular.");
    coletor(p.coletorId);
    if (!MATERIAIS[p.material]) throw new RegraDeNegocio("PEDIDO_INVALIDO", "Confira o campo 'material'.");
    if (!QUALIDADES[p.qualidade]) throw new RegraDeNegocio("PEDIDO_INVALIDO", "Confira o campo 'qualidade'.");
    const kg = Math.round(p.kg * 100) / 100;
    if (kg < 0.1 || kg > KG_MAXIMO) {
      throw new RegraDeNegocio("PESO_INVALIDO", `O peso precisa estar entre 0,1 e ${KG_MAXIMO} kg por parada.`);
    }
    const id = `pes_${String(++seqPesagem).padStart(4, "0")}`;
    const cred = credito(p.material, p.qualidade, kg);
    const em = iso();
    const destinatarios = perfisDoTitular(t.id).map((x) => x.id);
    if (cred === 0) {
      const orientacao = "Desta vez o material não foi aceito. Enxágue, escorra e guarde coberto. Na próxima passagem a gente pesa de novo.";
      const rejeitada = comNota10({
        id, titularId: t.id, titularNome: t.nome, coletorId: p.coletorId, material: p.material, qualidade: p.qualidade,
        kgParada: kg, kgRecepcao: null, creditoCentavos: 0, ajusteCentavos: 0, transacaoId: null, status: "REJEITADA", orientacao, em,
      });
      guardarPesagem(p.chave, rejeitada);
      notificar(destinatarios, "Material não aceito", orientacao, agoraMs());
      publicar("pesagem", rejeitada);
      return rejeitada;
    }
    if (cred > LIMITE_PARADA_CENTAVOS) {
      throw new RegraDeNegocio("LIMITE_PARADA", `Esta parada passa do limite de ${verdonasTxt(LIMITE_PARADA_CENTAVOS)}.`);
    }
    if (creditadoHoje(t.id) + cred > LIMITE_DIA_CENTAVOS) {
      throw new RegraDeNegocio("LIMITE_DIA", `O limite diário de ${verdonasTxt(LIMITE_DIA_CENTAVOS)} por titular foi atingido.`);
    }
    const memo = `Entrega de ${kgTxt(kg)} kg de ${MATERIAIS[p.material].rotulo} (${QUALIDADES[p.qualidade].rotulo.toLowerCase()})`;
    let r;
    try {
      r = transferir(`pesagem:${id}`, "CREDITO_PESAGEM", memo, FUNDO_ID, carteiraId(t.id), cred);
    } catch (e) {
      if (e.codigo === "SALDO_INSUFICIENTE") {
        throw new RegraDeNegocio("FUNDO_INSUFICIENTE", "O fundo do patrocinador não cobre esta emissão. Nenhuma verdona foi emitida.");
      }
      throw e;
    }
    const pesagem = comNota10({
      id, titularId: t.id, titularNome: t.nome, coletorId: p.coletorId, material: p.material, qualidade: p.qualidade,
      kgParada: kg, kgRecepcao: null, creditoCentavos: cred, ajusteCentavos: 0, transacaoId: r.transacao.id,
      status: "PROVISORIA", orientacao: null, em,
    });
    guardarPesagem(p.chave, pesagem);
    const nota10 = p.qualidade === "LIMPO";
    notificar(
      destinatarios,
      nota10 ? "Nota 10! Verdonas na carteira" : "Verdonas na carteira",
      nota10
        ? `Material limpo. Você recebeu ${verdonasTxt(cred)}.`
        : `Você recebeu ${verdonasTxt(cred)} pela entrega de ${kgTxt(kg)} kg de ${MATERIAIS[p.material].rotulo}.`,
      r.transacao.origem,
    );
    publicar("pesagem", pesagem);
    return pesagem;
  }
  function pesagemPorId(id) {
    const p = pesagens.get(id);
    if (!p) throw new RegraDeNegocio("PESAGEM_INEXISTENTE", `Pesagem não encontrada: ${id}`);
    return p;
  }
  function registrarRecepcao(pesagemId, kgRecepcao) {
    const p = pesagemPorId(pesagemId);
    if (p.status === "REJEITADA") throw new RegraDeNegocio("PESAGEM_REJEITADA", "Essa pesagem não gerou crédito.");
    if (p.kgRecepcao != null) throw new RegraDeNegocio("RECEPCAO_JA_REGISTRADA", "A recepção desta pesagem já foi registrada.");
    const kg = Math.round(kgRecepcao * 100) / 100;
    if (kg < 0 || kg > KG_MAXIMO) throw new RegraDeNegocio("PESO_INVALIDO", "Peso de recepção inválido.");
    const novoCredito = credito(p.material, p.qualidade, Math.min(kg, p.kgParada));
    const diferenca = p.creditoCentavos - novoCredito;
    const destinatarios = perfisDoTitular(p.titularId).map((x) => x.id);
    let atualizada;
    if (diferenca <= 0) {
      atualizada = comNota10({ ...p, kgRecepcao: kg, ajusteCentavos: 0, status: "CONFIRMADA", orientacao: "Peso conferido na recepção." });
    } else {
      const conta = carteiraId(p.titularId);
      const reverter = Math.min(saldo(conta), diferenca);
      const absorvido = diferenca - reverter;
      let origem = agoraMs();
      if (reverter > 0) {
        origem = transferir(`ajuste:${p.id}`, "AJUSTE_RECEPCAO", `Ajuste de pesagem: a recepção pesou ${kgTxt(kg)} kg`, conta, FUNDO_ID, reverter).transacao.origem;
      }
      const nota = `A recepção pesou ${kgTxt(kg)} kg. Ajuste de ${verdonasTxt(reverter)}.` +
        (absorvido > 0 ? ` O fundo cobriu ${verdonasTxt(absorvido)} já gastas.` : "");
      atualizada = comNota10({ ...p, kgRecepcao: kg, ajusteCentavos: reverter, status: "AJUSTADA", orientacao: nota });
      notificar(destinatarios, "Ajuste de pesagem", nota, origem);
    }
    pesagens.set(p.id, atualizada);
    publicar("pesagem", atualizada);
    return atualizada;
  }
  const pesagensRecentes = (n) => [...pesagens.values()].reverse().slice(0, n);
  const kgConsiderado = (p) => (p.kgRecepcao != null ? Math.min(p.kgRecepcao, p.kgParada) : p.kgParada);
  function somarPor(chaveFn) {
    const m = new Map();
    pesagens.forEach((p) => {
      if (p.status !== "REJEITADA") m.set(chaveFn(p), (m.get(chaveFn(p)) || 0) + kgConsiderado(p));
    });
    return m;
  }
  const notas10PorTitular = () => {
    const m = new Map();
    pesagens.forEach((p) => {
      if (p.nota10) m.set(p.titularId, (m.get(p.titularId) || 0) + 1);
    });
    return m;
  };
  const pesagensHoje = () => [...pesagens.values()].filter((p) => diaSP(new Date(p.em)) === diaSP(new Date())).length;

  // ---------- cobrança ----------
  const cobrancas = new Map();
  let seqCobranca = 0;
  function criarCobranca(comercioId, valorCentavos) {
    const c = comercioPorId(comercioId);
    if (c.status !== "ATIVO") {
      throw new RegraDeNegocio("COMERCIO_NAO_ATIVO", `${c.nome} ainda está em validação e não aceita a verdona.`);
    }
    if (!(valorCentavos > 0) || valorCentavos > VALOR_MAXIMO_CENTAVOS) {
      throw new RegraDeNegocio("VALOR_INVALIDO", `O valor da cobrança precisa estar entre 0,01 e ${reaisTxt(VALOR_MAXIMO_CENTAVOS)}.`);
    }
    const id = `cob_${String(++seqCobranca).padStart(4, "0")}`;
    const cob = {
      id, comercioId: c.id, comercioNome: c.nome, valorCentavos, status: "PENDENTE", criadaEm: iso(),
      pagaPorPerfilId: null, titularId: null, transacaoId: null, liquidacaoId: null, pagaEm: null,
    };
    cobrancas.set(id, cob);
    publicar("cobranca", cob);
    return cob;
  }
  function cobrancaPorId(id) {
    const c = cobrancas.get(id);
    if (!c) throw new RegraDeNegocio("COBRANCA_INEXISTENTE", `Cobrança não encontrada: ${id}`);
    return c;
  }
  function gastoDoDia(perfilId) {
    const hoje = diaSP(new Date());
    return [...cobrancas.values()]
      .filter((c) => c.status === "PAGA" && c.pagaPorPerfilId === perfilId && diaSP(new Date(c.pagaEm)) === hoje)
      .reduce((a, c) => a + c.valorCentavos, 0);
  }
  function confirmarCobranca(cobrancaId, perfilId) {
    const c = cobrancaPorId(cobrancaId);
    if (c.status === "PAGA") {
      if (perfilId === c.pagaPorPerfilId) return c; // idempotente: repetir a confirmação não debita de novo
      throw new RegraDeNegocio("COBRANCA_JA_PAGA", "Esta cobrança já foi paga.");
    }
    const perfil = participante(perfilId);
    const titularId = perfil.tipo === "TITULAR" ? perfil.id : perfil.titularId;
    if (perfil.tipo === "DELEGADO") {
      if (c.valorCentavos > perfil.limiteCompraCentavos) {
        throw new RegraDeNegocio("LIMITE_COMPRA", `O limite deste perfil é ${verdonasTxt(perfil.limiteCompraCentavos)} por compra. Peça à titular para ajustar ou divida a compra.`);
      }
      if (gastoDoDia(perfil.id) + c.valorCentavos > perfil.limiteDiaCentavos) {
        throw new RegraDeNegocio("LIMITE_DIA", `O limite diário deste perfil é ${verdonasTxt(perfil.limiteDiaCentavos)}. Peça à titular para ajustar ou tente amanhã.`);
      }
    }
    let r;
    try {
      r = transferir(`resgate:${c.id}`, "RESGATE", `Compra em ${c.comercioNome}`, carteiraId(titularId), aPagarId(c.comercioId), c.valorCentavos);
    } catch (e) {
      if (e.codigo === "SALDO_INSUFICIENTE") {
        throw new RegraDeNegocio(
          "SALDO_INSUFICIENTE",
          `Seu saldo é de ${verdonasTxt(saldo(carteiraId(titularId)))} e esta compra é de ${verdonasTxt(c.valorCentavos)}. Peça ao comércio para ajustar o valor.`,
        );
      }
      throw e;
    }
    const paga = { ...c, status: "PAGA", pagaPorPerfilId: perfil.id, titularId, transacaoId: r.transacao.id, pagaEm: iso() };
    cobrancas.set(c.id, paga);
    notificar(perfisDoTitular(titularId).map((x) => x.id), "Pagamento confirmado", `Você gastou ${verdonasTxt(c.valorCentavos)} em ${c.comercioNome}.`, r.transacao.origem);
    notificar([c.comercioId], "Pagamento recebido", `${verdonasTxt(c.valorCentavos)} recebidas. Entram no Pix do fechamento do dia.`, r.transacao.origem);
    publicar("cobranca", paga);
    return paga;
  }
  const todasCobrancas = () => [...cobrancas.values()].reverse();
  const pendentes = () => todasCobrancas().filter((c) => c.status === "PENDENTE");
  function marcarLiquidadas(comercioId, liquidacaoId) {
    cobrancas.forEach((c, id) => {
      if (c.status === "PAGA" && c.liquidacaoId == null && c.comercioId === comercioId) cobrancas.set(id, { ...c, liquidacaoId });
    });
  }
  const totalLiquidadoPor = (liquidacaoId) =>
    [...cobrancas.values()].filter((c) => c.liquidacaoId === liquidacaoId).reduce((a, c) => a + c.valorCentavos, 0);
  const totalPagoSemLiquidacao = () =>
    [...cobrancas.values()].filter((c) => c.status === "PAGA" && c.liquidacaoId == null).reduce((a, c) => a + c.valorCentavos, 0);

  // ---------- liquidação e conciliação ----------
  const liquidacoes = [];
  const extratoParceiro = [];
  let seqLiq = 0;
  const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function gerarEndToEnd() {
    const carimbo = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 12);
    const bytes = new Uint8Array(11);
    (globalThis.crypto || { getRandomValues: (a) => a.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(bytes);
    return `E00000000${carimbo}${[...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("")}`; // 32 caracteres, como o Pix
  }
  function fecharDia() {
    const geradas = [];
    for (const c of comercios.values()) {
      const devido = saldo(aPagarId(c.id));
      if (devido <= 0) continue;
      const id = `liq_${String(++seqLiq).padStart(4, "0")}`;
      const e2e = gerarEndToEnd();
      const r = transferir(`liquidacao:${id}`, "LIQUIDACAO_PIX", `Pix agregado para ${c.nome}`, aPagarId(c.id), PARCEIRO_ID, devido);
      marcarLiquidadas(c.id, id);
      const liq = { id, comercioId: c.id, comercioNome: c.nome, centavos: devido, endToEndId: e2e, em: r.transacao.em };
      liquidacoes.push(liq);
      extratoParceiro.push({ endToEndId: e2e, comercioId: c.id, centavos: devido, em: r.transacao.em });
      notificar([c.id], "Pix enviado", `Pix de R$ ${reaisTxt(devido)} enviado pelo fechamento do dia.`, r.transacao.origem);
      geradas.push(liq);
    }
    publicar("liquidacao", geradas);
    return geradas;
  }
  function conciliar() {
    const itens = [];
    let divergencias = 0;
    for (const liq of liquidacoes) {
      const doParceiro = extratoParceiro.filter((i) => i.endToEndId === liq.endToEndId).reduce((a, i) => a + i.centavos, 0);
      const dosResgates = totalLiquidadoPor(liq.id);
      const ok = liq.centavos === doParceiro && liq.centavos === dosResgates;
      if (!ok) divergencias++;
      itens.push({ liquidacaoId: liq.id, comercioNome: liq.comercioNome, endToEndId: liq.endToEndId, ledgerCentavos: liq.centavos, parceiroCentavos: doParceiro, resgatesCentavos: dosResgates, ok });
    }
    const pendente = [...comercios.values()].reduce((a, c) => a + saldo(aPagarId(c.id)), 0);
    if (pendente !== totalPagoSemLiquidacao()) divergencias++;
    const invariantes = invariantesOk();
    if (!invariantes) divergencias++;
    return { ok: divergencias === 0, divergencias, pendenteCentavos: pendente, invariantesOk: invariantes, itens, em: iso() };
  }
  function injetarDivergencia() {
    if (extratoParceiro.length === 0) throw new RegraDeNegocio("SEM_LIQUIDACAO", "Feche o dia antes de simular uma divergência.");
    const u = extratoParceiro.length - 1;
    extratoParceiro[u] = { ...extratoParceiro[u], centavos: extratoParceiro[u].centavos - 1 };
  }

  // ---------- painel ----------
  function painel() {
    const fundo = saldo(FUNDO_ID);
    const circulacao = titulares().reduce((a, t) => a + saldo(carteiraId(t.id)), 0);
    const aPagar = [...comercios.values()].reduce((a, c) => a + saldo(aPagarId(c.id)), 0);
    const kgPorMaterial = {};
    const porMat = somarPor((p) => p.material);
    Object.keys(MATERIAIS).forEach((m) => {
      if (porMat.has(m)) kgPorMaterial[MATERIAIS[m].rotulo] = porMat.get(m);
    });
    const kgTotal = [...porMat.values()].reduce((a, b) => a + b, 0);
    const notas10 = notas10PorTitular();
    const ordenado = [...somarPor((p) => p.titularId).entries()].sort((a, b) => b[1] - a[1]);
    const ranking = ordenado.slice(0, 5).map(([id, kg], i) => ({
      posicao: i + 1, titularId: id, nome: participante(id).nome, kg: Math.round(kg * 10) / 10, notas10: notas10.get(id) || 0,
    }));
    const resumo = [...comercios.values()].map((c) => ({
      id: c.id, nome: c.nome, bairro: c.bairro, status: c.status, aPagarCentavos: saldo(aPagarId(c.id)),
      recebidoCentavos: liquidacoes.filter((l) => l.comercioId === c.id).reduce((a, l) => a + l.centavos, 0),
    }));
    const atual = Math.round(kgTotal * 10) / 10;
    return {
      emissaoDisponivelCentavos: fundo,
      emCirculacaoCentavos: circulacao,
      aPagarCentavos: aPagar,
      liquidadoCentavos: saldo(PARCEIRO_ID),
      lastroOk: true,
      invariantesOk: invariantesOk(),
      kgTotal: atual,
      kgPorMaterial,
      ranking,
      comercios: resumo,
      ultimasTransacoes: ultimasTransacoes(12).map((t) => ({ id: t.id, tipo: t.tipo, memo: t.memo, centavos: t.centavos, em: t.em })),
      push: pushEstatisticas(),
      cobrancasPendentes: pendentes().length,
      pesagensHoje: pesagensHoje(),
      totalTransacoes: transacoes.length,
      rota: [...coletores.values()][0]?.rota ?? "",
      metaBairro: {
        metaKg: META_BAIRRO_KG, kgAtual: atual, percentual: Math.min(100, Math.round((atual / META_BAIRRO_KG) * 100)),
        atingida: atual >= META_BAIRRO_KG, premio: PREMIO_META,
      },
    };
  }

  // ---------- carteira (visão do participante) ----------
  function carteira(id) {
    const t = participante(id);
    const conta = carteiraId(t.tipo === "TITULAR" ? t.id : t.titularId);
    const linhas = extrato(conta, 20).map((l) => {
      const tx = porId.get(l.transacaoId);
      return { seq: l.seq, transacaoId: l.transacaoId, tipo: tx.tipo, memo: tx.memo, centavos: l.sentido === "CREDITO" ? l.centavos : -l.centavos, em: l.em };
    });
    return { titularId: t.id, nome: t.nome, saldoCentavos: saldo(conta), perfis: perfisDoTitular(t.id), extrato: linhas, cobrancasPendentes: pendentes() };
  }

  function cadastros() {
    return {
      titulares: titulares(),
      perfis: [...participantes.values()],
      comercios: [...comercios.values()],
      coletores: [...coletores.values()],
      materiais: Object.entries(MATERIAIS).map(([id, m]) => ({ id, rotulo: m.rotulo, centavosPorKg: m.centavosPorKg })),
      qualidades: Object.entries(QUALIDADES).map(([id, q]) => ({ id, rotulo: q.rotulo, fator: q.fator })),
      limites: { paradaCentavos: LIMITE_PARADA_CENTAVOS, diaCentavos: LIMITE_DIA_CENTAVOS, kgMaximo: KG_MAXIMO },
    };
  }

  // ---------- demonstração: semeadura e reinício ----------
  function semear() {
    silencioso = true;
    try {
      abrirConta({ id: FUNDO_ID, nome: "Fundo do patrocinador (exemplo)", tipo: "FUNDO", permiteNegativo: false }, FUNDO_INICIAL_CENTAVOS);
      titulares().forEach((t) => abrirConta({ id: carteiraId(t.id), nome: `Carteira de ${t.nome}`, tipo: "CARTEIRA", permiteNegativo: false }, 0));
      comercios.forEach((c) => abrirConta({ id: aPagarId(c.id), nome: `A pagar a ${c.nome}`, tipo: "A_PAGAR", permiteNegativo: false }, 0));
      abrirConta({ id: PARCEIRO_ID, nome: "Parceiro de pagamento (Pix)", tipo: "PARCEIRO", permiteNegativo: false }, 0);
      const ped = (titularId, material, qualidade, kg, chave) => ({ titularId, coletorId: "marcos", material, qualidade, kg, chave });
      const historico = [
        registrarPesagem(ped("seu-jorge", "PET", "LIMPO", 22.5, "seed-jorge")),
        registrarPesagem(ped("dona-neide", "PET", "LIMPO", 18, "seed-neide")),
        registrarPesagem(ped("familia-souza", "ALUMINIO", "LIMPO", 3, "seed-souza-1")),
        registrarPesagem(ped("familia-souza", "PET", "ACEITAVEL", 9.5, "seed-souza-2")),
        registrarPesagem(ped("joana-lima", "PAPEL", "LIMPO", 9, "seed-joana")),
      ];
      historico.forEach((h) => registrarRecepcao(h.id, h.kgParada)); // o histórico já foi conferido na recepção
      const cob = criarCobranca("padaria-estrela", 3_000);
      confirmarCobranca(cob.id, "seu-jorge");
    } finally {
      silencioso = false;
      pushReiniciar(); // as notificações da semeadura não entram nas estatísticas
    }
  }
  function reiniciar() {
    ledgerReiniciar();
    pesagens.clear();
    pesagemPorChave.clear();
    seqPesagem = 0;
    cobrancas.clear();
    seqCobranca = 0;
    liquidacoes.length = 0;
    extratoParceiro.length = 0;
    seqLiq = 0;
    pushReiniciar();
    semear();
    publicar("reiniciado", { ok: true });
  }

  ledgerReiniciar();
  ouvintesLedger.push((tx) => publicar("transacao", { id: tx.id, tipo: tx.tipo, memo: tx.memo, centavos: tx.centavos, em: tx.em }));
  semear();

  return {
    assinar,
    cadastros, carteira, painel, conciliar, fecharDia, injetarDivergencia, reiniciar,
    registrarPesagem, registrarRecepcao, pesagensRecentes,
    criarCobranca, confirmarCobranca, todasCobrancas,
    // apoio aos testes
    saldo, invariantesOk, copia,
  };
}
