import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

function Banner({ p, fim }) {
  useEffect(() => {
    const t = setTimeout(fim, 5200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      layout
      initial={{ y: -44, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -22 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="rounded-2xl bg-white/95 px-3 py-2.5 shadow-lift ring-1 ring-black/5 backdrop-blur"
      role="status"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-[13px] font-bold leading-tight">{p.titulo}</p>
        <span className="num shrink-0 rounded-full bg-hortela px-2 py-0.5 text-[10px] font-bold text-mataescura">
          push em {p.latenciaMs.toLocaleString("pt-BR")} ms
        </span>
      </div>
      <p className="mt-0.5 text-[12px] leading-snug text-suave">{p.corpo}</p>
    </motion.div>
  );
}

function PushStack({ pushes, ids }) {
  const [ocultos, setOcultos] = useState(() => new Set());
  const visiveis = pushes
    .filter((p) => p.destinatarios.some((d) => ids.includes(d)) && !ocultos.has(p.id))
    .slice(-2);
  return (
    <div className="pointer-events-none absolute inset-x-3 top-10 z-20 flex flex-col gap-2">
      <AnimatePresence>
        {visiveis.map((p) => (
          <Banner key={p.id} p={p} fim={() => setOcultos((o) => new Set(o).add(p.id))} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Phone({ titulo, subtitulo, foco, children, pushes, ids }) {
  return (
    <figure className="flex flex-col items-center gap-4">
      <figcaption className="text-center">
        <p className="font-display text-xl font-bold tracking-tight">{titulo}</p>
        <p className="text-sm text-suave">{subtitulo}</p>
      </figcaption>
      <div className={`phone ${foco ? "phone-foco" : ""}`}>
        <div className="phone-tela">
          <div className="phone-status">
            <span>9:41</span>
            <span className="phone-ilha" aria-hidden="true" />
            <span>5G</span>
          </div>
          {children}
          <PushStack pushes={pushes} ids={ids} />
        </div>
      </div>
    </figure>
  );
}

export function Stepper({ valor, aoMudar, passo, min, max, formatar, rotulo }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-linha bg-papel px-2 py-1.5">
      <button
        type="button"
        className="btn btn-secundario h-9 w-9 text-xl"
        aria-label={`Diminuir ${rotulo}`}
        onClick={() => aoMudar(Math.max(min, Math.round((valor - passo) * 100) / 100))}
      >
        −
      </button>
      <div className="text-center">
        <p className="num font-display text-2xl font-extrabold leading-none">{formatar(valor)}</p>
        <p className="text-[11px] text-suave">{rotulo}</p>
      </div>
      <button
        type="button"
        className="btn btn-secundario h-9 w-9 text-xl"
        aria-label={`Aumentar ${rotulo}`}
        onClick={() => aoMudar(Math.min(max, Math.round((valor + passo) * 100) / 100))}
      >
        +
      </button>
    </div>
  );
}

export function Aviso({ children }) {
  if (!children) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="rounded-xl bg-[#F8E5E0] px-3 py-2 text-[12px] font-semibold leading-snug text-erro"
    >
      {children}
    </motion.p>
  );
}
