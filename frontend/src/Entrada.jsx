import { useState } from "react";
import { entrar } from "./acesso.js";
import { Aviso } from "./ui.jsx";

/** Acesso ao painel de gestão: admin e implantador. */
export default function Entrada({ aoEntrar }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [verificando, setVerificando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setVerificando(true);
    try {
      const sessao = await entrar(usuario, senha);
      if (!sessao) setErro("Usuário ou senha incorretos.");
      else aoEntrar(sessao);
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setVerificando(false);
    }
  }

  const campo = "h-12 w-full rounded-2xl border border-linha bg-papel px-4 text-base outline-none focus:border-mata focus:ring-2 focus:ring-mata/30";
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-7 shadow-suave ring-1 ring-linha">
      <h3 className="font-display text-2xl font-extrabold tracking-tight">Painel de gestão</h3>
      <p className="mt-2 text-suave">Acesso para o admin e para o implantador.</p>
      <form onSubmit={enviar} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
          Usuário
          <input className={campo} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
          Senha
          <input className={campo} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </label>
        <Aviso>{erro}</Aviso>
        <button type="submit" className="btn btn-primario h-12" disabled={verificando}>
          {verificando ? "Verificando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-[12px] text-suave">Na versão de teste, o acesso só limita a tela. Ele não protege dados reais.</p>
    </div>
  );
}
