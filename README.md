# Verdona: MVP de demonstração

Garrafa guardada paga a mistura. Backend em Java (Spring Boot) com ledger de dupla entrada e
front em React com animações. Todos os dados são de exemplo e nenhum dinheiro de verdade se move.

## O que roda aqui

- **Ledger único e consistente:** dupla entrada, lançamentos imutáveis, saldo que nunca fica negativo, operações idempotentes.
- **Coleta e pesagem em camadas:** o coletor pesa na porta (crédito imediato), a recepção confere depois e a diferença vira ajuste.
- **Perfil delegado:** a neta paga com a conta da avó, dentro de um limite por compra e por dia.
- **Cobrança e resgate:** o comércio cobra, o participante confirma. O preço em verdonas é igual ao preço em dinheiro.
- **Fechamento do dia:** um Pix agregado por comércio (parceiro simulado) com identificador de 32 caracteres.
- **Conciliação:** confere livro, resgates e extrato do parceiro. O botão "Simular divergência" mostra a detecção.
- **Ao vivo:** eventos por SSE e push simulado, com a latência interna medida.
- **Gamificação:** selo **Nota 10** para material limpo e **meta do bairro**, uma meta coletiva (75 kg de exemplo) com um broto que cresce até o prêmio comunitário.

## Testar online (sem servidor)

A demonstração roda **toda no navegador**: o mesmo ledger, as mesmas regras e os mesmos textos do backend Java, com dados de
exemplo. Por isso funciona no GitHub Pages ou na Vercel, que só servem o front-end.

**GitHub Pages**
1. Suba o repositório (veja "Subir para o GitHub", abaixo).
2. No GitHub: Settings, Pages, Source: **GitHub Actions**. O arquivo `.github/workflows/pages.yml` publica a cada push na `main`.
3. O endereço sai em `https://<usuario>.github.io/<repositorio>/`.

**Vercel**
1. Importe o repositório.
2. Em *Root Directory*, escolha `frontend`. O resto a Vercel detecta sozinha (Vite, `npm run build`, saída `dist`).

**Rodar na sua máquina**
```bash
cd frontend
npm install
npm run dev        # demonstração no navegador, sem servidor
npm test           # 14 testes do motor do navegador
```

**Acesso ao painel de gestão:** há dois perfis, **admin** (faz tudo, inclusive fechar o dia e simular divergência) e
**implantador** (vê o painel e confere). As senhas ficam só como hash em `frontend/src/acesso.js`. Para trocar:
`node frontend/scripts/gerar-acesso.mjs admin NovaSenha` e cole a linha gerada. **Atenção:** sem servidor, a verificação roda
no navegador e é só uma barreira de demonstração. Ela não protege dados reais.

## Como rodar com o backend Java (referência para o piloto)

```bash
# terminal 1: backend na porta 8080
cd backend && mvn spring-boot:run
# terminal 2: front na porta 5173, falando com o backend
cd frontend && npm install && npm run dev:backend
```
`npm run build:backend` gera a versão que fala com o backend. Os testes do Java: `cd backend && mvn test` (13 testes).
Regra de ledger mudou? Mude no Java **e** em `frontend/src/mock/engine.js`, e rode os dois conjuntos de testes.

## Subir para o GitHub

```bash
git init -b main
sh scripts/instalar-hooks.sh        # impede subir o CLAUDE.md e os docs privados
git add .
git status                          # CLAUDE.md e docs/specs, adr, grill e juridico NÃO podem aparecer
git commit -m "Verdona: demonstração no navegador e método de trabalho"
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```
Se o repositório já tiver arquivos (README, licença), rode antes `git pull origin main --allow-unrelated-histories`.

## API (resumo)

| Método e caminho | Para quê |
|---|---|
| `GET /api/cadastros` | Titulares, perfis, comércios, materiais e limites |
| `POST /api/pesagens` | Pesagem na porta, com crédito imediato |
| `POST /api/pesagens/{id}/recepcao` | Peso conferido na recepção (ajuste se for menor) |
| `POST /api/cobrancas` e `/{id}/confirmar` | Cobrança do comércio e pagamento pelo perfil |
| `POST /api/liquidacoes/fechar-dia` | Pix agregado por comércio |
| `GET /api/conciliacao` | Livro x resgates x extrato do parceiro |
| `GET /api/painel`, `GET /api/carteiras/{id}` | Dados do painel e da carteira |
| `GET /api/stream` | Eventos ao vivo (SSE) |
| `POST /api/demo/reiniciar`, `/demo/divergencia` | Utilidades da demonstração |

## Limites desta versão (de propósito)

- **Sem autenticação:** qualquer cliente chama qualquer rota, inclusive o reinício. Não exponha na internet.
- **Em memória:** o estado some ao reiniciar. O ledger foi desenhado para trocar por PostgreSQL.
- **Parceiro de Pix e push são simulados.** A latência medida é interna ao servidor. O push real depende de FCM e APNs.
- **Valores de exemplo:** tabela de pontos por kg, limites, fundo de R$ 5.000 e comércios são ilustrativos.
- **Sem visão computacional, sem balança integrada, sem login por perfil.**

## Próximos passos

1. Teste de concorrência e de propriedades no ledger (jqwik).
2. Mutation testing (PIT) no núcleo: ledger, cobrança, coleta e conciliação.
3. Actuator e métricas de negócio (circulação, lastro, a pagar).
4. Script de carga (k6) em pesagem, pagamento e fechamento do dia.
5. Autenticação e autorização, e verificação de assinatura do webhook do Pix, antes de qualquer piloto.
6. PostgreSQL com Testcontainers.

## Copy

Todo texto visível segue o documento **Copy da Verdona por público e por tela** (página inicial, app do participante,
coletor, caixa do comércio, painel e mensagens de push). Sem "mistura", sem gíria de dinheiro e sem promessa de saque.

Ainda sem tela, e portanto sem texto aplicado: pedir coleta e lembrete, ajustar limites do perfil, foto e modo offline do
coletor, confirmação da pesagem pelo participante, e toda a Área do Prestador (spec 002).

Para conferir o vocabulário: `sh scripts/checar-vocabulario.sh` (deve imprimir "Vocabulário limpo").

## Nome e cores

O demo usa **Verdona** como nome do programa, do sistema e da marca, e **verdona(s)** como unidade (1 verdona = R$ 1,00 de
compra no comércio parceiro), conforme a ADR-0014. Ainda faltam o teste de nome em voz alta, INPI, domínio, Instagram e
parecer do advogado. Riscos conhecidos: a rima com "boladona" (elogio e deboche), "Verdão" (Palmeiras) e "verdinha" (gíria
de dólar). Em texto público a verdona é vale-compra: sem "moeda", sem "banco" e sem promessa de saque.

A paleta é verde com **cobre**, e não amarelo-ouro: o par verde e amarelo está muito carregado de significado político
no Brasil. A cor fica em `frontend/tailwind.config.js` (`moeda`).

## Estrutura

```
backend/   Spring Boot 3.3, Java 21: ledger, serviços, API REST e testes
frontend/  React 18, Vite, Tailwind e Motion: três celulares e o painel de gestão
```
