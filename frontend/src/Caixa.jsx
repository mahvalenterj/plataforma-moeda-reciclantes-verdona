import { AnimatePresence, motion } from "motion/react";
import { Aviso, Phone, Stepper } from "./ui.jsx";
import { reais } from "./lib.js";

function Qr({ semente }) {
  const n = 21;
  let h = 0;
  for (const ch of semente) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
  const achado = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const quadrados = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!achado(x, y) && rnd() > 0.52) quadrados.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  const Marca = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="#FBFAF5" />
      <rect x="2" y="2" width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="h-28 w-28" fill="#0B2A1B" role="img" aria-label="Código da cobrança">
      {quadrados}
      <Marca x={0} y={0} />
      <Marca x={n - 7} y={0} />
      <Marca x={0} y={n - 7} />
    </svg>
  );
}

export default function Caixa({ cad, painel, cobrancas, valor, setValor, estado, aoCobrar, foco, pushes }) {
  const comercio = cad.comercios.find((c) => c.id === "seu-osvaldo");
  const atual = cobrancas.find((c) => c.comercioId === comercio.id);
  const resumo = painel?.comercios.find((c) => c.id === comercio.id);
  const paga = atual?.status === "PAGA";

  return (
    <Phone
      titulo="Caixa do Seu Osvaldo"
      subtitulo="Cobra em verdonas, recebe em Pix"
      foco={foco}
      pushes={pushes}
      ids={[comercio.id]}
    >
      <div className="phone-corpo">
        <div className="rounded-3xl bg-gradient-to-br from-mata to-floresta p-4 text-white">
          <p className="text-xs text-white/70">{comercio.nome}</p>
          <p className="mt-1 text-xs text-white/70">A receber hoje</p>
          <motion.p key={resumo?.aPagarCentavos} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="num font-display text-3xl font-extrabold leading-none">
            R$ {reais(resumo?.aPagarCentavos ?? 0)}
          </motion.p>
        </div>

        <Stepper valor={valor / 100} aoMudar={(v) => setValor(Math.round(v * 100))} passo={5} min={5} max={1000} formatar={(v) => `R$ ${reais(Math.round(v * 100))}`} rotulo="valor da compra" />
        <p className="px-1 text-[11px] text-suave">Cobre o mesmo preço de sempre. A verdona vale R$ 1,00 na sua loja.</p>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Valores rápidos">
          {[3500, 5000, 8000].map((v) => (
            <button key={v} type="button" className="chip" aria-pressed={valor === v} onClick={() => setValor(v)}>
              R$ {reais(v).replace(",00", "")}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-primario h-12 text-[15px]" disabled={estado.enviando} onClick={aoCobrar}>
          {estado.enviando ? "Gerando a cobrança…" : estado.feito ? "Cobrança enviada ✓" : "Cobrar em verdonas"}
        </button>
        <Aviso>{estado.erro && `Esta cobrança não passou: ${estado.erro} Tente de novo ou cobre de outra forma.`}</Aviso>

        <AnimatePresence mode="wait">
          {atual && (
            <motion.div
              key={atual.id + atual.status}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-3xl border border-linha bg-white p-3"
            >
              {paga ? (
                <motion.div
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-hortela"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="#2E7A3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.15 }} />
                  </svg>
                </motion.div>
              ) : (
                <Qr semente={atual.id} />
              )}
              <div className="min-w-0">
                <p className="num font-display text-xl font-extrabold">{reais(atual.valorCentavos)}</p>
                <p className="text-[12px] font-semibold">{paga ? "Pago com verdonas." : "Aguardando o cliente confirmar"}</p>
                {paga && <p className="text-[11px] text-suave">Entra no Pix do fechamento do dia.</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto rounded-2xl border-2 border-dashed border-mata/40 bg-hortela/60 p-3 text-center">
          <p className="font-display text-lg font-extrabold text-mataescura">Aqui aceita verdona.</p>
        </div>
      </div>
    </Phone>
  );
}
