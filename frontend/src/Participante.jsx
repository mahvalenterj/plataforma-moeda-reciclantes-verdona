import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moeda } from "./Marca.jsx";
import { Aviso, Phone } from "./ui.jsx";
import { reais, useContagem, verdonas } from "./lib.js";

function ChuvaDeMoedas({ rajada }) {
  if (rajada === 0) return null;
  const moedas = Array.from({ length: 10 }, (_, i) => ({
    i,
    x: 6 + ((i * 41) % 86),
    atraso: (i % 5) * 0.07,
    giro: (i % 2 ? 1 : -1) * (140 + i * 22),
  }));
  return (
    <div key={rajada} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {moedas.map((m) => (
        <motion.span
          key={m.i}
          className="absolute top-0"
          style={{ left: `${m.x}%` }}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: [-30, 78, 64], opacity: [0, 1, 0], rotate: m.giro }}
          transition={{ duration: 1.35, delay: m.atraso, ease: "easeIn" }}
        >
          <Moeda tamanho={20} />
        </motion.span>
      ))}
    </div>
  );
}

function Icone({ tipo }) {
  const entrada = tipo === "CREDITO_PESAGEM";
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-bold ${
        entrada ? "bg-hortela text-mataescura" : "bg-[#F3DFC9] text-[#6B3A14]"
      }`}
      aria-hidden="true"
    >
      {entrada ? "+" : tipo === "AJUSTE_RECEPCAO" ? "↺" : "−"}
    </span>
  );
}

export default function Participante({ cad, carteira, perfil, setPerfil, pendente, ultimaPaga, estado, aoPagar, foco, pushes, reduzido }) {
  const saldo = carteira?.saldoCentavos ?? 0;
  const mostrado = useContagem(saldo, reduzido);
  const [rajada, setRajada] = useState(0);
  const [vale, setVale] = useState(false);
  const anterior = useRef(saldo);
  useEffect(() => {
    if (saldo > anterior.current && !reduzido) setRajada((r) => r + 1);
    anterior.current = saldo;
  }, [saldo, reduzido]);

  const perfis = cad.perfis.filter((p) => p.id === "dona-maria" || p.id === "julia");
  const atual = perfis.find((p) => p.id === perfil);
  const ativos = cad.comercios.filter((c) => c.status === "ATIVO");

  return (
    <Phone
      titulo="App da Dona Maria"
      subtitulo="Verdonas, extrato e pagamento"
      foco={foco}
      pushes={pushes}
      ids={["dona-maria", "julia"]}
    >
      <div className="phone-corpo">
        <div className="flex rounded-full border border-linha bg-papel p-1" role="group" aria-label="Quem está usando o app">
          {perfis.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={perfil === p.id}
              onClick={() => setPerfil(p.id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-[12px] font-bold transition ${
                perfil === p.id ? "bg-floresta text-white" : "text-suave"
              }`}
            >
              {p.id === "dona-maria" ? "Dona Maria" : "Júlia (neta)"}
            </button>
          ))}
        </div>

        {atual?.tipo === "DELEGADO" && (
          <p className="rounded-2xl bg-papel px-3 py-2 text-[11px] leading-snug text-suave">
            <span className="font-bold text-tinta">Júlia usa a conta da Dona Maria.</span> O perfil tem limite por compra e por dia. A titular
            pode mudar ou desligar quando quiser. Limites do demo: {verdonas(atual.limiteCompraCentavos)} por compra e{" "}
            {verdonas(atual.limiteDiaCentavos)} por dia.
          </p>
        )}

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-floresta via-[#12402A] to-mata p-4 text-white">
          <ChuvaDeMoedas rajada={rajada} />
          <p className="text-xs text-white/70">Seu saldo</p>
          {carteira ? (
            <p className="num mt-1 font-display text-[44px] font-extrabold leading-none">{reais(mostrado)}</p>
          ) : (
            <p className="mt-2 text-base text-white/80">Buscando seu saldo…</p>
          )}
          <p className="mt-1 text-xs text-white/75">verdonas</p>
          <p className="mt-0.5 text-xs text-white/75">1 verdona vale R$ 1,00 no comércio do bairro.</p>
        </div>
        <AnimatePresence mode="popLayout">
          {pendente && (
            <motion.div
              key={pendente.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="rounded-3xl border-2 border-mata bg-white p-4 shadow-suave"
            >
              <p className="text-[12px] text-suave">{pendente.comercioNome} cobra</p>
              <p className="num font-display text-3xl font-extrabold">{verdonas(pendente.valorCentavos)}</p>
              <p className="text-[11px] text-suave">O mesmo preço que você pagaria em reais.</p>
              <button type="button" className="btn btn-primario mt-3 h-11 w-full" disabled={estado.enviando} onClick={aoPagar}>
                {estado.enviando ? "Pagando…" : `Pagar ${verdonas(pendente.valorCentavos)}`}
              </button>
              <div className="mt-2">
                <Aviso>{estado.erro}</Aviso>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="button" className="btn btn-secundario h-10 text-[13px]" aria-expanded={vale} onClick={() => setVale(!vale)}>
          Ver onde vale
        </button>
        {vale && (
          <div className="rounded-2xl border border-linha bg-papel p-3">
            <p className="text-[13px] font-bold">Veja os comércios perto de você</p>
            {ativos.length === 0 ? (
              <p className="mt-1 text-[12px] text-suave">Ainda não há comércio aceitando no seu bairro. Quando houver, aparece aqui.</p>
            ) : (
              <>
                <p className="mt-1 text-[12px] text-suave">{ativos.length} comércios aceitam a Verdona em Quintino (exemplo).</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {ativos.map((c) => (
                    <li key={c.id} className="text-[12px] font-semibold">{c.nome}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {estado.feito && ultimaPaga && !pendente && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="rounded-2xl bg-hortela px-3 py-2 text-[13px] font-bold text-mataescura"
          >
            Pago. Você gastou {verdonas(ultimaPaga.valorCentavos)} em {ultimaPaga.comercioNome}.
          </motion.p>
        )}

        <div>
          <p className="mb-1.5 font-display text-sm font-bold">Extrato</p>
          {(carteira?.extrato ?? []).length === 0 && (
            <p className="rounded-2xl border border-dashed border-linha p-3 text-[12px] text-suave">
              Nada por aqui ainda. Quando o coletor pesar seu material, a verdona aparece na hora.
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {(carteira?.extrato ?? []).slice(0, 4).map((l) => (
                <motion.li
                  key={l.seq}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 rounded-2xl bg-papel px-2.5 py-2"
                >
                  <Icone tipo={l.tipo} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{l.memo}</span>
                  <span className={`num text-[13px] font-extrabold ${l.centavos > 0 ? "text-mataescura" : "text-[#6B3A14]"}`}>
                    {l.centavos > 0 ? "+" : "−"}
                    {reais(Math.abs(l.centavos))}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>

        <p className="rounded-2xl bg-hortela/70 px-3 py-2 text-[12px] text-mataescura">
          <b>Guarde limpo e seco.</b> Enxágue, escorra e deixe coberto.
        </p>
      </div>
    </Phone>
  );
}
