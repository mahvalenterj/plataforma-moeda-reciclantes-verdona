import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Aviso, Phone, Stepper } from "./ui.jsx";
import { kg, reais, useAcao } from "./lib.js";

const AJUDA = {
  LIMPO: "Enxaguado e escorrido.",
  ACEITAVEL: "Com pouco resto. Rende menos.",
  CONTAMINADO: "Não será aceito nesta parada.",
};

const STATUS = { PROVISORIA: "Provisória", CONFIRMADA: "Conferida", AJUSTADA: "Ajustada", REJEITADA: "Não aceita" };

export default function Coletor({ cad, form, setForm, estado, aoConfirmar, pesagens, acoes, foco, pushes }) {
  const [estRec, rodarRec] = useAcao();
  const [recKg, setRecKg] = useState(0);
  const material = cad.materiais.find((m) => m.id === form.material);
  const qual = cad.qualidades.find((q) => q.id === form.qualidade);
  const estimativa = Math.floor(form.kg * material.centavosPorKg * qual.fator + 1e-9);
  const aberta = pesagens.find((p) => p.status !== "REJEITADA" && p.kgRecepcao == null);

  useEffect(() => {
    if (aberta) setRecKg(Math.max(0, Math.round((aberta.kgParada - 1) * 10) / 10));
  }, [aberta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Phone titulo="App do coletor" subtitulo="Pesa na porta e registra a entrega" foco={foco} pushes={pushes} ids={["marcos"]}>
      <div className="phone-corpo">
        <p className="px-1 text-[12px] font-semibold text-suave">Rota de hoje: {cad.titulares.length} paradas</p>
        <div className="rounded-3xl bg-gradient-to-br from-mata to-floresta p-4 text-white">
          <label className="text-xs text-white/70" htmlFor="titular">Parada</label>
          <select
            id="titular"
            value={form.titularId}
            onChange={(e) => setForm({ ...form, titularId: e.target.value })}
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 font-display text-lg font-bold text-white"
          >
            {cad.titulares.map((t) => (
              <option key={t.id} value={t.id} className="text-tinta">{t.nome}</option>
            ))}
          </select>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/70">Vale</p>
              <motion.p
                key={estimativa}
                initial={{ opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="num font-display text-3xl font-extrabold leading-none"
              >
                {reais(estimativa)}
              </motion.p>
              <p className="text-xs text-white/70">verdonas</p>
            </div>
            <p className="text-right text-xs text-white/70">
              {reais(material.centavosPorKg)} por kg (exemplo)
              <br />
              qualidade {qual.rotulo.toLowerCase()}
            </p>
          </div>
        </div>

        <p className="-mb-1 px-1 text-[12px] font-semibold text-suave">Qual material?</p>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Material">
          {cad.materiais.map((m) => (
            <button
              key={m.id}
              type="button"
              className="chip"
              aria-pressed={form.material === m.id}
              onClick={() => setForm({ ...form, material: m.id })}
            >
              {m.rotulo.split(" ")[0]}
            </button>
          ))}
        </div>

        <Stepper
          valor={form.kg}
          aoMudar={(v) => setForm({ ...form, kg: v })}
          passo={0.5}
          min={0.5}
          max={cad.limites.kgMaximo}
          formatar={kg}
          rotulo="quilos na balança"
        />

        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Qualidade do material">
          {cad.qualidades.map((q) => (
            <button
              key={q.id}
              type="button"
              className="chip"
              aria-pressed={form.qualidade === q.id}
              onClick={() => setForm({ ...form, qualidade: q.id })}
            >
              {q.rotulo}
            </button>
          ))}
        </div>
        <p className="px-1 text-[12px] text-suave">{AJUDA[form.qualidade]}</p>

        <div className="relative">
          <button type="button" className="btn btn-primario h-12 w-full text-[15px]" disabled={estado.enviando} onClick={aoConfirmar}>
            {estado.enviando ? "Registrando…" : estado.feito ? "Pesagem registrada ✓" : "Confirmar pesagem"}
          </button>
          <AnimatePresence>
            {estado.feito && form.qualidade === "LIMPO" && (
              <motion.span
                key="nota10"
                initial={{ scale: 2.2, rotate: -26, opacity: 0 }}
                animate={{ scale: 1, rotate: -12, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 340, damping: 14 }}
                className="pointer-events-none absolute -top-6 right-1 grid h-14 w-14 place-items-center rounded-full bg-moeda text-center font-display text-[13px] font-extrabold leading-none text-floresta shadow-lift ring-2 ring-white"
              >
                Nota
                <br />
                10
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <Aviso>{estado.erro}</Aviso>

        {aberta && (
          <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-linha bg-papel p-3">
            <p className="text-[12px] font-semibold">
              Última parada: {kg(aberta.kgParada)} kg de {aberta.material === "PET" ? "PET" : aberta.material.toLowerCase()}
              <span className="ml-2 rounded-full bg-hortela px-2 py-0.5 text-[10px] font-bold text-mataescura">{STATUS[aberta.status]}</span>
              {aberta.nota10 && <span className="ml-1 rounded-full bg-moeda/40 px-2 py-0.5 text-[10px] font-extrabold text-[#6B3A14]">Nota 10</span>}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-linha bg-white">
                <button type="button" className="h-9 w-8 text-lg font-bold" aria-label="Diminuir peso da recepção" onClick={() => setRecKg(Math.max(0, Math.round((recKg - 0.5) * 10) / 10))}>−</button>
                <span className="num w-[58px] text-center font-display text-sm font-extrabold">{kg(recKg)} kg</span>
                <button type="button" className="h-9 w-8 text-lg font-bold" aria-label="Aumentar peso da recepção" onClick={() => setRecKg(Math.min(cad.limites.kgMaximo, Math.round((recKg + 0.5) * 10) / 10))}>+</button>
              </div>
              <button
                type="button"
                className="btn btn-secundario h-9 flex-1 text-[12px]"
                disabled={estRec.enviando}
                onClick={() => rodarRec(() => acoes.recepcao(aberta.id, recKg)).catch(() => {})}
              >
                {estRec.enviando ? "Conferindo…" : "Conferir na recepção"}
              </button>
            </div>
            <Aviso>{estRec.erro}</Aviso>
          </motion.div>
        )}
      </div>
    </Phone>
  );
}
