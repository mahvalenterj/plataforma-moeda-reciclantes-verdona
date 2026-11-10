import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moeda } from "./Marca.jsx";
import { Aviso } from "./ui.jsx";
import { kg, reais, useAcao, useContagem, MODO_MOCK } from "./lib.js";

const TIPOS = { CREDITO_PESAGEM: "Pesagem", RESGATE: "Resgate", LIQUIDACAO_PIX: "Pix", AJUSTE_RECEPCAO: "Ajuste" };

function Kpi({ rotulo, centavos, nota, reduzido, forte }) {
  const v = useContagem(centavos, reduzido);
  return (
    <div className={`rounded-2xl p-4 ${forte ? "bg-floresta text-white" : "border border-linha bg-white"}`}>
      <p className={`text-[12px] ${forte ? "text-white/70" : "text-suave"}`}>{rotulo}</p>
      <p className="num mt-1 font-display text-[26px] font-extrabold leading-tight">R$ {reais(v)}</p>
      <p className={`mt-0.5 text-[11px] ${forte ? "text-white/70" : "text-suave"}`}>{nota}</p>
    </div>
  );
}

function Cartao({ titulo, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-linha bg-white p-4 ${className}`}>
      <h3 className="mb-3 font-display text-base font-bold tracking-tight">{titulo}</h3>
      {children}
    </section>
  );
}

function Broto({ progresso, reduzido }) {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden="true">
      <ellipse cx="32" cy="60" rx="18" ry="3" fill="#0B2A1B" opacity=".12" />
      <motion.g
        initial={false}
        animate={{ scale: 0.3 + 0.7 * progresso }}
        transition={reduzido ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14 }}
        style={{ transformOrigin: "32px 58px" }}
      >
        <path d="M32 58V30" stroke="#2E7A3A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M32 34c-12 0-18-7-18-16 11 0 18 5 18 16z" fill="#52B862" />
        <path d="M32 28c10 0 16-6 16-14-10 0-16 4-16 14z" fill="#2E7A3A" />
        {progresso >= 1 && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.3 }} style={{ transformOrigin: "32px 9px" }}>
            <circle cx="32" cy="9" r="6" fill="#C07A3A" />
            <circle cx="32" cy="9" r="3.6" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
          </motion.g>
        )}
      </motion.g>
    </svg>
  );
}

function Confete() {
  const moedas = Array.from({ length: 16 }, (_, i) => ({ i, x: 3 + ((i * 29) % 92), atraso: (i % 6) * 0.08, giro: (i % 2 ? 1 : -1) * (160 + i * 18) }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {moedas.map((m) => (
        <motion.span
          key={m.i}
          className="absolute top-0"
          style={{ left: `${m.x}%` }}
          initial={{ y: -24, opacity: 0, rotate: 0 }}
          animate={{ y: [-24, 90, 120], opacity: [0, 1, 0], rotate: m.giro }}
          transition={{ duration: 1.6, delay: m.atraso, ease: "easeIn" }}
        >
          <Moeda tamanho={18} />
        </motion.span>
      ))}
    </div>
  );
}

function MetaBairro({ b, reduzido }) {
  const [festa, setFesta] = useState(0);
  const antes = useRef(b.atingida);
  useEffect(() => {
    if (b.atingida && !antes.current && !reduzido) setFesta((n) => n + 1);
    antes.current = b.atingida;
  }, [b.atingida, reduzido]);
  const progresso = Math.min(1, b.kgAtual / b.metaKg);
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-4 transition-colors duration-500 lg:col-span-2 ${
        b.atingida ? "border-moeda bg-[#F8EBDD]" : "border-linha bg-white"
      }`}
    >
      {festa > 0 && <Confete key={festa} />}
      <div className="relative flex flex-wrap items-center gap-4">
        <Broto progresso={progresso} reduzido={reduzido} />
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-base font-bold tracking-tight">Meta do bairro</h3>
            <p className="num text-sm font-extrabold">
              {kg(b.kgAtual)} de {kg(b.metaKg)} kg
            </p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-hortela">
            <motion.div
              className="h-full rounded-full bg-mata"
              initial={false}
              animate={{ width: `${progresso * 100}%` }}
              transition={{ type: "spring", stiffness: 110, damping: 20 }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-suave">
            {b.atingida
              ? `O bairro ganhou ${b.premio}.`
              : `O bairro reuniu ${kg(b.kgAtual)} de ${kg(b.metaKg)} kg (exemplo). Faltam ${kg(Math.max(0, b.metaKg - b.kgAtual))} kg para ${b.premio}.`}
          </p>
        </div>
        {b.atingida && (
          <motion.span
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="rounded-full bg-moeda px-3 py-1.5 font-display text-sm font-extrabold text-floresta"
          >
            Meta batida!
          </motion.span>
        )}
      </div>
    </section>
  );
}

const abreviar = (e2e) => `${e2e.slice(0, 13)}…${e2e.slice(-4)}`;

export default function Painel({ painel, conc, acoes, foco, reduzido, papel = "admin" }) {
  const podeOperar = papel === "admin";
  const [estFechar, rodarFechar] = useAcao();
  const [estDiv, rodarDiv] = useAcao();
  if (!painel) return null;
  const maxKg = Math.max(1, ...painel.ranking.map((r) => r.kg));
  const temItens = (conc?.itens?.length ?? 0) > 0;

  return (
    <div className={`janela transition-shadow duration-500 ${foco ? "shadow-[0_0_0_3px_#8FD07B,0_0_70px_8px_rgba(143,208,123,.45)]" : ""}`}>
      <div className="janela-barra">
        <i /> <i /> <i />
        <div className="janela-url">painel.local/gincana-quintino-limpo</div>
      </div>
      <div className="bg-folha p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-3xl font-extrabold tracking-tight">Gincana Quintino Limpo</h3>
            <p className="text-sm text-suave">
              {painel.rota} · {kg(painel.kgTotal)} kg coletados · {painel.pesagensHoje} pesagens hoje · {painel.totalTransacoes} lançamentos
            </p>
          </div>
          <p
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
              painel.lastroOk && painel.invariantesOk ? "bg-hortela text-mataescura" : "bg-[#F8E5E0] text-erro"
            }`}
          >
            {painel.lastroOk && painel.invariantesOk ? "Lastro integral e livro consistente" : "Atenção: livro inconsistente"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Emissão disponível" centavos={painel.emissaoDisponivelCentavos} nota="O que o fundo ainda pode emitir" reduzido={reduzido} forte />
          <Kpi rotulo="Verdonas em circulação" centavos={painel.emCirculacaoCentavos} nota="O que está nas carteiras" reduzido={reduzido} />
          <Kpi rotulo="A pagar aos comércios" centavos={painel.aPagarCentavos} nota="Compras feitas que ainda não viraram Pix" reduzido={reduzido} />
          <Kpi rotulo="Liquidado por Pix" centavos={painel.liquidadoCentavos} nota="Já pago pelo parceiro de pagamento" reduzido={reduzido} />
        </div>
        <p className="mt-2 text-[12px] text-suave">Lastro: reserva maior ou igual ao que está em circulação e a pagar.</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <MetaBairro b={painel.metaBairro} reduzido={reduzido} />
          <Cartao titulo="Ranking da gincana">
            <ol className="flex flex-col gap-2.5">
              {painel.ranking.map((r) => (
                <motion.li key={r.titularId} layout transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex items-center gap-3">
                  <span className="num grid h-7 w-7 place-items-center rounded-full bg-hortela text-[12px] font-extrabold text-mataescura">{r.posicao}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
                        <span className="truncate">{r.nome}</span>
                        {r.notas10 > 0 && (
                          <span className="shrink-0 rounded-full bg-moeda/30 px-2 py-0.5 text-[10px] font-extrabold text-[#6B3A14]">
                            Nota 10 ×{r.notas10}
                          </span>
                        )}
                      </p>
                      <p className="num text-sm font-extrabold">{kg(r.kg)} kg</p>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-hortela">
                      <motion.div
                        className="h-full rounded-full bg-mata"
                        initial={false}
                        animate={{ width: `${(r.kg / maxKg) * 100}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Cartao>

          <Cartao titulo="Transações ao vivo">
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {painel.ultimasTransacoes.slice(0, 6).map((t) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-folha px-3 py-2"
                  >
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-suave ring-1 ring-linha">{TIPOS[t.tipo] ?? t.tipo}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t.memo}</span>
                    <span className="num text-[13px] font-extrabold">{reais(t.centavos)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <p className="mt-3 text-[11px] text-suave">
              Push: {painel.push.total} {painel.push.total === 1 ? "enviado" : "enviados"}, média {painel.push.mediaMs.toLocaleString("pt-BR")} ms e máxima{" "}
              {painel.push.maximaMs.toLocaleString("pt-BR")} ms {MODO_MOCK ? "no navegador, simulado" : "no servidor"}. Meta do produto: aceite pelo serviço de push em até 2 s.
            </p>
          </Cartao>

          <Cartao titulo="Comércios">
            <ul className="flex flex-col gap-2">
              {painel.comercios.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-semibold">{c.nome}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="num text-[12px] text-suave">a pagar R$ {reais(c.aPagarCentavos)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "ATIVO" ? "bg-hortela text-mataescura" : "bg-[#F3DFC9] text-[#6B3A14]"}`}>
                      {c.status === "ATIVO" ? "Aceita a verdona" : "Em validação"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao titulo="Fechamento do dia e conciliação">
            <p className="text-[12px] text-suave">Um Pix por comércio, agregado, e conferência entre o livro, os resgates e o extrato do parceiro.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {podeOperar && (
                <button type="button" className="btn btn-primario h-10 px-4 text-[13px]" disabled={estFechar.enviando} onClick={() => rodarFechar(() => acoes.fecharDia()).catch(() => {})}>
                  {estFechar.enviando ? "Fechando…" : "Fechar o dia e gerar os Pix"}
                </button>
              )}
              <button type="button" className="btn btn-secundario h-10 px-4 text-[13px]" onClick={() => acoes.conciliar()}>
                Conferir agora
              </button>
              {podeOperar && (
                <button type="button" className="btn btn-secundario h-10 px-4 text-[13px]" disabled={!temItens || estDiv.enviando} onClick={() => rodarDiv(() => acoes.divergencia()).catch(() => {})}>
                  Simular divergência
                </button>
              )}
            </div>
            {!podeOperar && <p className="mt-2 text-[12px] text-suave">Fechar o dia e simular divergência são do admin.</p>}
            <div className="mt-2">
              <Aviso>{estFechar.erro || estDiv.erro}</Aviso>
            </div>
            <AnimatePresence mode="wait">
              {conc && (
                <motion.div key={conc.ok ? "ok" : "erro"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
                  <p className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${conc.ok ? "bg-hortela text-mataescura" : "bg-[#F8E5E0] text-erro"}`}>
                    {conc.ok ? "Conciliado: 0 divergências" : `${conc.divergencias} ${conc.divergencias === 1 ? "divergência" : "divergências"}. Veja os itens marcados.`}
                  </p>
                  {temItens ? (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {conc.itens.map((i) => (
                        <li key={i.liquidacaoId} className="flex items-center justify-between gap-2 rounded-xl bg-folha px-3 py-2 text-[12px]">
                          <span className="min-w-0">
                            <span className="block truncate font-bold">{i.comercioNome}</span>
                            <span className="block truncate font-mono text-[10px] text-suave">{abreviar(i.endToEndId)}</span>
                          </span>
                          <span className="text-right">
                            <span className="num block font-extrabold">R$ {reais(i.ledgerCentavos)}</span>
                            <span className={`text-[10px] font-bold ${i.ok ? "text-mataescura" : "text-erro"}`}>
                              {i.ok ? "livro = resgates = parceiro" : `parceiro: R$ ${reais(i.parceiroCentavos)}`}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12px] text-suave">Nenhum Pix ainda. Feche o dia para gerar a liquidação.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Cartao>

          <Cartao titulo="Resumo para o patrocinador" className="lg:col-span-2">
            <p className="text-[13px] font-bold">Resultado de hoje em Quintino (exemplo)</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["kg coletados", kg(painel.kgTotal)],
                ["famílias participando", String(painel.ranking.length)],
                ["comércios aceitando", String(painel.comercios.filter((c) => c.status === "ATIVO").length)],
                ["verdonas em circulação", reais(painel.emCirculacaoCentavos)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-2xl bg-folha p-3">
                  <dd className="num font-display text-2xl font-extrabold">{valor}</dd>
                  <dt className="text-[12px] text-suave">{rotulo}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-suave">
              Cada verdona em circulação tem reserva no fundo. Relatório de contas e conciliação disponível.
            </p>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
