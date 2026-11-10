import { useCallback, useEffect, useRef, useState } from "react";
import { criarMotor } from "./mock/engine.js";
import { criarApiMock } from "./mock/api.js";

/** Padrão: demonstração 100% no navegador (GitHub Pages, Vercel). Com --mode backend, usa o servidor Java. */
export const MODO_MOCK = import.meta.env.MODE !== "backend";
const motor = MODO_MOCK ? criarMotor() : null;
const apiMock = MODO_MOCK ? criarApiMock(motor) : null;
const abrirStream = () => (MODO_MOCK ? motor.assinar() : new EventSource("/api/stream"));

export const reais = (c) =>
  ((c ?? 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const verdonas = (c) =>
  `${c % 100 === 0 ? String(c / 100) : reais(c)} ${c === 100 ? "verdona" : "verdonas"}`;
export const kg = (v) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const novaChave = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);

export async function api(path, opcoes = {}) {
  if (MODO_MOCK) return apiMock(path, opcoes);
  const { method = "GET", body } = opcoes;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const semRede = new Error("Sem conexão com o servidor. Tente de novo quando a conexão voltar.");
    semRede.codigo = "SEM_CONEXAO";
    throw semRede;
  }
  const texto = await res.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    const erro = new Error(dados?.mensagem || "Não deu certo agora. Tente de novo em instantes.");
    erro.codigo = dados?.codigo;
    throw erro;
  }
  return dados;
}

/** Anima um número (em centavos) até o novo valor. */
export function useContagem(alvo, reduzido) {
  const [valor, setValor] = useState(alvo);
  const anterior = useRef(alvo);
  useEffect(() => {
    if (reduzido || anterior.current === alvo) {
      setValor(alvo);
      anterior.current = alvo;
      return undefined;
    }
    const de = anterior.current;
    const inicio = performance.now();
    let raf;
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      setValor(Math.round(de + (alvo - de) * e));
      if (p < 1) raf = requestAnimationFrame(passo);
      else anterior.current = alvo;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, reduzido]);
  return valor;
}

/** Estado da demonstração: dados (motor do navegador ou backend Java) + eventos em tempo real. */
export function useDemo() {
  const [cad, setCad] = useState(null);
  const [painel, setPainel] = useState(null);
  const [carteira, setCarteira] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [pesagens, setPesagens] = useState([]);
  const [conc, setConc] = useState(null);
  const [pushes, setPushes] = useState([]);
  const [conectado, setConectado] = useState(false);
  const [erroInicial, setErroInicial] = useState(null);
  const timer = useRef(null);

  const recarregar = useCallback(async () => {
    const [p, c, ps, cw] = await Promise.all([
      api("/painel"),
      api("/cobrancas"),
      api("/pesagens"),
      api("/carteiras/dona-maria"),
    ]);
    setPainel(p);
    setCobrancas(c);
    setPesagens(ps);
    setCarteira(cw);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cadastros = await api("/cadastros");
        if (!vivo) return;
        setCad(cadastros);
        await recarregar();
      } catch (e) {
        if (vivo) setErroInicial(e.message);
      }
    })();
    const es = abrirStream();
    const agendar = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => recarregar().catch(() => {}), 80);
    };
    es.addEventListener("ola", () => setConectado(true));
    es.onerror = () => setConectado(false);
    ["transacao", "pesagem", "cobranca", "liquidacao", "reiniciado"].forEach((t) => es.addEventListener(t, agendar));
    es.addEventListener("reiniciado", () => setConc(null));
    es.addEventListener("push", (e) => {
      const p = JSON.parse(e.data);
      setPushes((atual) => [...atual.slice(-11), { ...p, id: novaChave() }]);
    });
    return () => {
      vivo = false;
      clearTimeout(timer.current);
      es.close();
    };
  }, [recarregar]);

  const conciliar = useCallback(async () => {
    const c = await api("/conciliacao");
    setConc(c);
    return c;
  }, []);

  const acoes = {
    pesar: (corpo) => api("/pesagens", { method: "POST", body: { ...corpo, chave: novaChave() } }),
    recepcao: (id, kgRecepcao) => api(`/pesagens/${id}/recepcao`, { method: "POST", body: { kg: kgRecepcao } }),
    cobrar: (comercioId, valorCentavos) => api("/cobrancas", { method: "POST", body: { comercioId, valorCentavos } }),
    confirmar: (id, perfilId) => api(`/cobrancas/${id}/confirmar`, { method: "POST", body: { perfilId } }),
    fecharDia: async () => {
      const l = await api("/liquidacoes/fechar-dia", { method: "POST" });
      await conciliar();
      return l;
    },
    conciliar,
    divergencia: async () => {
      const c = await api("/demo/divergencia", { method: "POST" });
      setConc(c);
      return c;
    },
    reiniciar: async () => {
      await api("/demo/reiniciar", { method: "POST" });
      setConc(null);
    },
  };

  return { cad, painel, carteira, cobrancas, pesagens, conc, pushes, conectado, erroInicial, acoes, recarregar };
}

/** Envolve uma ação assíncrona com estados de envio, sucesso e erro para a interface. */
export function useAcao() {
  const [estado, setEstado] = useState({ enviando: false, feito: false, erro: null });
  const rodar = useCallback(async (fn) => {
    setEstado({ enviando: true, feito: false, erro: null });
    try {
      const r = await fn();
      setEstado({ enviando: false, feito: true, erro: null });
      setTimeout(() => setEstado((e) => ({ ...e, feito: false })), 1800);
      return r;
    } catch (e) {
      setEstado({ enviando: false, feito: false, erro: e.message });
      throw e;
    }
  }, []);
  return [estado, rodar];
}
