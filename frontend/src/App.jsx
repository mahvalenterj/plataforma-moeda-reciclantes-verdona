import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { Marca, Moeda, RotaFundo } from "./Marca.jsx";
import Coletor from "./Coletor.jsx";
import Participante from "./Participante.jsx";
import Caixa from "./Caixa.jsx";
import Painel from "./Painel.jsx";
import Entrada from "./Entrada.jsx";
import { lerSessao, sair as sairDaSessao } from "./acesso.js";
import { MODO_MOCK, api, kg, reais, sleep, useAcao, useContagem, useDemo } from "./lib.js";

function Icone({ tipo }) {
  return (
    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-hortela text-mataescura" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {tipo === "balanca" ? (
          <>
            <path d="M5 20h14M12 4v16M5 8h14" />
            <path d="M5 8l-2.5 6a3 3 0 005 0L5 8zM19 8l-2.5 6a3 3 0 005 0L19 8z" />
          </>
        ) : (
          <>
            <path d="M5 8h14l-1 12H6L5 8z" />
            <path d="M9 8a3 3 0 016 0" />
          </>
        )}
      </svg>
    </span>
  );
}

function Equacao({ reduzido }) {
  const [alvo, setAlvo] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAlvo(3500), 500);
    return () => clearTimeout(t);
  }, []);
  const v = useContagem(alvo, reduzido);
  const itens = [
    { grande: "14,0 kg", pequeno: "de PET limpo na balança do coletor" },
    { grande: reais(v), pequeno: "verdonas na carteira, na hora", destaque: true },
    { grande: "R$ 35,00", pequeno: "em compras no Seu Osvaldo, pelo mesmo preço" },
  ];
  return (
    <div className="relative rounded-[32px] bg-white/80 p-5 shadow-lift ring-1 ring-linha backdrop-blur sm:p-7">
      <p className="mb-3 text-[12px] font-bold text-suave">Exemplo do demo</p>
      <ul className="flex flex-col gap-3">
        {itens.map((it, i) => (
          <motion.li
            key={i}
            initial={reduzido ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.18, type: "spring", stiffness: 220, damping: 22 }}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${it.destaque ? "bg-floresta text-white" : "bg-folha"}`}
          >
            {it.destaque ? <Moeda tamanho={34} /> : <Icone tipo={i === 0 ? "balanca" : "sacola"} />}
            <div>
              <p className="num font-display text-3xl font-extrabold leading-none">{it.grande}</p>
              <p className={`mt-1 text-[13px] ${it.destaque ? "text-white/75" : "text-suave"}`}>{it.pequeno}</p>
            </div>
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-suave">A tabela real por quilo ainda será definida.</p>
    </div>
  );
}

export default function App() {
  const reduzido = useReducedMotion();
  const demo = useDemo();
  const { cad, painel, carteira, cobrancas, pesagens, conc, pushes, conectado, erroInicial, acoes } = demo;
  const { scrollYProgress } = useScroll();

  const [form, setForm] = useState({ titularId: "dona-maria", material: "PET", kg: 14, qualidade: "LIMPO" });
  const [valor, setValor] = useState(3500);
  const [perfil, setPerfil] = useState("julia");
  const [foco, setFoco] = useState(null);
  const [narrador, setNarrador] = useState(null);
  const [rodando, setRodando] = useState(false);
  const [stPesar, rodarPesar] = useAcao();
  const [stCobrar, rodarCobrar] = useAcao();
  const [stPagar, rodarPagar] = useAcao();
  const [sessao, setSessao] = useState(lerSessao);

  const pendente = cobrancas.find((c) => c.status === "PENDENTE");
  const ultimaPaga = cobrancas.find((c) => c.status === "PAGA");
  const pesar = () => rodarPesar(() => acoes.pesar({ ...form, coletorId: "marcos" }));
  const cobrar = () => rodarCobrar(() => acoes.cobrar("seu-osvaldo", valor));
  const pagar = () => (pendente ? rodarPagar(() => acoes.confirmar(pendente.id, perfil)) : Promise.resolve());

  async function reiniciar() {
    await acoes.reiniciar();
    setForm({ titularId: "dona-maria", material: "PET", kg: 14, qualidade: "LIMPO" });
    setValor(3500);
  }

  async function rodarRoteiro() {
    if (rodando) return;
    setRodando(true);
    try {
      setNarrador("Começando do zero, com o fundo cheio e a gincana em andamento.");
      await reiniciar();
      const palco = document.getElementById("palco");
      if (palco) {
        const topo = palco.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: topo, behavior: reduzido ? "auto" : "smooth" });
      }
      await sleep(1500);
      setFoco("coletor");
      setNarrador("Marcos pesa 14 kg de PET limpo na porta da Dona Maria.");
      setForm({ titularId: "dona-maria", material: "PET", kg: 14, qualidade: "LIMPO" });
      await sleep(1600);
      await rodarPesar(() => acoes.pesar({ titularId: "dona-maria", material: "PET", qualidade: "LIMPO", kg: 14, coletorId: "marcos" }));
      setFoco("participante");
      setNarrador("As 35 verdonas entram na hora na carteira dela, com push no celular.");
      await sleep(3000);
      setFoco("caixa");
      setNarrador("Na hora da compra, o Seu Osvaldo cobra R$ 35,00, o mesmo preço de sempre.");
      setValor(3500);
      await sleep(1500);
      await rodarCobrar(() => acoes.cobrar("seu-osvaldo", 3500));
      await sleep(1600);
      setFoco("participante");
      setPerfil("julia");
      setNarrador("A neta confirma no app, dentro do limite do perfil dela.");
      await sleep(1800);
      const lista = await api("/cobrancas");
      const aberta = lista.find((c) => c.status === "PENDENTE");
      await rodarPagar(() => acoes.confirmar(aberta.id, "julia"));
      await sleep(2600);
      if (!sessao) {
        setNarrador("O Pix do dia e a conciliação aparecem no painel de gestão, com acesso do admin e do implantador.");
        await sleep(3600);
        return;
      }
      setFoco("painel");
      setNarrador("No fechamento do dia, o Pix sai agregado por comércio, pelo parceiro licenciado.");
      await sleep(1600);
      await acoes.fecharDia();
      await sleep(2600);
      setNarrador("A conciliação confere livro, resgates e extrato do parceiro: nenhuma divergência.");
      await sleep(3200);
      setNarrador("E a entrega da Dona Maria ajudou o bairro a bater a meta de 75 kg.");
      await sleep(3200);
    } catch (e) {
      setNarrador(e.message);
    } finally {
      setRodando(false);
      setFoco(null);
      setTimeout(() => setNarrador(null), 3500);
    }
  }

  return (
    <div className="min-h-screen">
      <motion.div style={{ scaleX: scrollYProgress }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-mata" aria-hidden="true" />

      <header className="sticky top-0 z-50 border-b border-linha/70 bg-folha/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-3">
          <a href="#topo" className="flex items-center gap-3">
            <Marca tamanho={48} />
            <span className="leading-tight">
              <span className="block font-display text-[26px] font-extrabold leading-none tracking-tight">Verdona</span>
              <span className="block text-[12px] text-suave">Pra gastar no bairro</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-[15px] font-semibold text-suave md:flex" aria-label="Seções">
            <a className="hover:text-tinta" href="#como-funciona">Como funciona</a>
            <a className="hover:text-tinta" href="#palco">Demo</a>
            <a className="hover:text-tinta" href="#painel">Painel de gestão</a>
          </nav>
          <div className="flex items-center gap-2">
            {MODO_MOCK ? (
              <span className="hidden items-center rounded-full bg-[#F3DFC9] px-3 py-1.5 text-[12px] font-bold text-[#6B3A14] lg:flex">
                Demo com dados de exemplo
              </span>
            ) : (
              <span className="hidden items-center gap-2 rounded-full border border-linha bg-papel px-3 py-1.5 text-[12px] font-bold sm:flex" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${conectado ? "animate-pulse bg-mata" : "bg-erro"}`} />
                {conectado ? "ao vivo" : "reconectando"}
              </span>
            )}
            <button type="button" className="btn btn-secundario h-10 px-4 text-[13px]" disabled={rodando} onClick={reiniciar}>
              Reiniciar demo
            </button>
            {sessao ? (
              <button type="button" className="btn btn-secundario h-10 px-4 text-[13px]" onClick={() => { sairDaSessao(); setSessao(null); }}>
                Sair ({sessao.papel})
              </button>
            ) : (
              <a href="#painel" className="btn btn-primario h-10 px-4 text-[13px]">Entrar</a>
            )}
          </div>
        </div>
      </header>

      <main id="topo">
        <section className="relative overflow-hidden">
          <RotaFundo parado={reduzido} />
          <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-hortela blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-20">
            <div>
              <motion.h1
                initial={reduzido ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
                className="titulo font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold"
              >
                Guardou o material? A gente pesa na sua porta.
              </motion.h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-suave">
                Cada pesagem vira verdonas na hora. Você gasta nos comércios do bairro que aceitam.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primario h-14 px-7 text-base" disabled={rodando || !cad} onClick={rodarRoteiro}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  {rodando ? "Rodando a compra…" : "Rodar a compra da Dona Maria"}
                </button>
                <a href="#palco" className="btn btn-secundario h-14 px-6 text-base">Mexer nas telas</a>
              </div>
              <ul className="mt-7 space-y-2 text-[15px] text-suave">
                <li>✓ 1 verdona vale R$ 1,00 no comércio do bairro. Não dá para sacar nem transferir.</li>
                <li>✓ Demonstração com dados de exemplo: nenhum valor real se move.</li>
              </ul>
            </div>
            <Equacao reduzido={reduzido} />
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-[1240px] px-5">
            <h2 className="titulo font-display text-4xl font-extrabold sm:text-5xl">Como funciona</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { t: "Guarde limpo e seco.", d: "Enxágue, escorra e deixe coberto." },
                { t: "O coletor pesa na sua porta.", d: "Você confirma no celular." },
                { t: "As verdonas entram na hora.", d: "Veja onde vale e gaste." },
              ].map((p, i) => (
                <li key={p.t} className="rounded-3xl border border-linha bg-white p-6 shadow-suave">
                  <span className="num grid h-9 w-9 place-items-center rounded-full bg-hortela font-display text-base font-extrabold text-mataescura">{i + 1}</span>
                  <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{p.t}</h3>
                  <p className="mt-2 text-suave">{p.d}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl bg-white p-7 shadow-suave ring-1 ring-linha">
                <h3 className="font-display text-2xl font-extrabold tracking-tight">Ajude em casa com a conta da sua avó.</h3>
                <p className="mt-3 text-suave">
                  A titular é ela. Você usa um perfil com limite por compra e por dia, e ela pode mudar ou desligar quando quiser.
                </p>
                <a href="#palco" className="btn btn-primario mt-5 h-12 px-6">Criar meu perfil</a>
              </article>
              <article className="rounded-3xl bg-floresta p-7 text-white shadow-lift">
                <h3 className="font-display text-2xl font-extrabold tracking-tight">Mais gente do bairro no seu balcão.</h3>
                <p className="mt-3 text-white/80">
                  Você cobra o preço de sempre. O valor vem cheio por Pix no fechamento do dia. Cartaz para a vitrine incluso.
                </p>
                <p className="mt-2 text-[12px] text-white/60">Em definição: parceiro de pagamento, prazo e custos.</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a href="#palco" className="btn h-12 bg-white px-6 text-floresta">Quero aceitar a verdona</a>
                  <span className="rounded-2xl border-2 border-dashed border-white/40 px-4 py-2 font-display text-base font-extrabold">
                    Aqui aceita verdona.
                  </span>
                </div>
              </article>
            </div>

            <div id="onde-vale" className="mt-10 scroll-mt-24 rounded-3xl bg-white p-7 shadow-suave ring-1 ring-linha">
              <h3 className="font-display text-2xl font-extrabold tracking-tight">Veja os comércios perto de você</h3>
              {(() => {
                const ativos = cad?.comercios.filter((c) => c.status === "ATIVO") ?? [];
                if (ativos.length === 0) {
                  return <p className="mt-3 text-suave">Ainda não há comércio aceitando no seu bairro. Quando houver, aparece aqui.</p>;
                }
                return (
                  <>
                    <p className="mt-2 text-suave">{ativos.length} comércios aceitam a Verdona em Quintino (exemplo).</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {ativos.map((c) => (
                        <li key={c.id} className="rounded-full bg-hortela px-4 py-2 text-[14px] font-bold text-mataescura">{c.nome}</li>
                      ))}
                    </ul>
                  </>
                );
              })()}
              {painel?.metaBairro && (
                <p className="mt-6 border-t border-linha pt-5 text-suave">
                  Juntos, Quintino reuniu <b className="text-tinta">{kg(painel.metaBairro.kgAtual)} kg</b>. A meta é {kg(painel.metaBairro.metaKg)} kg para {painel.metaBairro.premio}.
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="palco" className="relative scroll-mt-20 bg-hortela/55 py-16">
          <div className="mx-auto max-w-[1240px] px-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="titulo font-display text-4xl font-extrabold sm:text-5xl">Uma entrega, três telas, um só livro.</h2>
                <p className="mt-3 max-w-xl text-suave">
                  Toda mudança passa por um único ledger. O que o coletor registra aparece na carteira, no caixa e no painel sem recarregar.
                </p>
              </div>
            </div>

            <div className="sticky top-[68px] z-40 mt-6 flex h-12 items-center justify-center">
              <AnimatePresence mode="wait">
                {narrador && (
                  <motion.p
                    key={narrador}
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-full bg-floresta px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-lift"
                    role="status"
                  >
                    {narrador}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {erroInicial && !MODO_MOCK && (
              <p className="mt-4 rounded-2xl bg-[#F8E5E0] p-4 text-sm font-semibold text-erro" role="alert">
                Não consegui falar com o backend em localhost:8080. Suba o servidor Java (pasta backend: mvn spring-boot:run) e recarregue a página.
              </p>
            )}
            {!cad && !erroInicial && <p className="mt-6 text-suave">{MODO_MOCK ? "Carregando a demonstração…" : "Conectando ao backend…"}</p>}

            {cad && (
              <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-14">
                <Coletor cad={cad} form={form} setForm={setForm} estado={stPesar} aoConfirmar={() => pesar().catch(() => {})} pesagens={pesagens} acoes={acoes} foco={foco === "coletor"} pushes={pushes} />
                <Participante cad={cad} carteira={carteira} perfil={perfil} setPerfil={setPerfil} pendente={pendente} ultimaPaga={ultimaPaga} estado={stPagar} aoPagar={() => pagar().catch(() => {})} foco={foco === "participante"} pushes={pushes} reduzido={reduzido} />
                <Caixa cad={cad} painel={painel} cobrancas={cobrancas} valor={valor} setValor={setValor} estado={stCobrar} aoCobrar={() => cobrar().catch(() => {})} foco={foco === "caixa"} pushes={pushes} />
              </div>
            )}
          </div>
        </section>

        <section id="painel" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-[1240px] px-5">
            <h2 className="titulo font-display text-4xl font-extrabold sm:text-5xl">Quem gere vê tudo no mesmo instante.</h2>
            <p className="mt-3 max-w-xl text-suave">
              Fundo, circulação, Pix e conciliação saem do mesmo livro. Se algo não bater, a conferência acusa.
            </p>
            <div className="mt-8">
              {sessao ? (
                <>
                  <p className="mb-4 rounded-2xl bg-hortela px-4 py-3 text-[14px] font-semibold text-mataescura" role="status">
                    Você entrou como {sessao.papel}.{" "}
                    {sessao.papel === "implantador"
                      ? "Neste perfil o painel é de leitura, com a conferência."
                      : "Neste perfil você pode fechar o dia, simular divergência e reiniciar a demo."}
                  </p>
                  <Painel painel={painel} conc={conc} acoes={acoes} foco={foco === "painel"} reduzido={reduzido} papel={sessao.papel} />
                </>
              ) : (
                <Entrada aoEntrar={setSessao} />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha py-8 text-center text-[13px] text-suave">
        Dados de exemplo. Valores e metas serão definidos no piloto.
      </footer>
    </div>
  );
}
