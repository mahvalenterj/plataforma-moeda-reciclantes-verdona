---
name: verdona-design-system
description: Use ao criar ou alterar qualquer tela, componente, cor, tipografia, espaçamento, sombra ou animação do Verdona. Garante o uso dos tokens de design-system/, os componentes base, a acessibilidade e as regras de movimento e de marca por organização.
---

# Design system Verdona

## Identidade
- Base creme (`superficie`) com verde-floresta (`superficie-forte`) e verde-mata (`acao`).
- **Cobre é o único acento quente** (`acento`). Nada de amarelo-ouro (ADR-0010).
- Tipografia: Bricolage Grotesque para títulos e números, Figtree para texto.
- Números de dinheiro e de peso são heróis: grandes, em fonte display, com algarismos tabulares.

## Tokens
- Fonte da verdade: `design-system/tokens.json`. Duas camadas: paleta (não usar em componente) e semânticos (usar sempre).
- No código, use as classes do preset (`bg-superficie`, `text-texto-suave`, `bg-acao`, `rounded-pilula`) ou as variáveis CSS. **Nunca** escreva hex, px de cor ou sombra solta.
- Token novo ou mudança de token semântico exige ADR.

## Componentes base e estados
Todo componente tem: padrão, foco visível, desabilitado, carregando, erro e sucesso.

| Componente | Regras |
|---|---|
| Botão pílula | Altura mínima de 48 px. Um primário por tela. Texto = verbo + o que a pessoa ganha |
| Chip de seleção | `aria-pressed`. Selecionado em `acao` |
| Stepper | Botões de 48 px, valor no centro em display |
| Cartão de saldo | `superficie-forte`, número grande, linha "onde vale" sempre visível |
| Banner de push | Título, corpo e selo de latência só no modo demo |
| Aviso de erro | `erro-fundo` e `erro`. Diz o que houve e como resolver |
| KPI | Rótulo, número e nota curta |
| Linha de extrato | Ícone de entrada ou saída, descrição, valor com sinal |

## Acessibilidade
- Contraste WCAG AA (4,5:1 no texto normal).
- Texto mínimo de 14 px no app e de 16 px nas telas da Dona Maria. O MVP ainda tem textos de 11 a 13 px a corrigir.
- Área de toque mínima de 48 px. Foco sempre visível.
- Nunca use só a cor para dar significado: junte ícone ou texto.

## Movimento
- Celebração só em três momentos: Nota 10, bolada batida e moedas caindo no saldo.
- Transições de estado com `padrao` (250 ms) e mola suave.
- Respeite `prefers-reduced-motion`: sem celebração e sem contagem animada.

## Marca por organização (white-label)
- Uma organização pode trocar `acao` e o logotipo via `[data-org]`.
- Nunca troque `erro`, `sucesso`, contraste mínimo ou tamanhos.

## Antes de terminar
- [ ] Só tokens semânticos, sem hex solto.
- [ ] Todos os estados do componente existem.
- [ ] Contraste e tamanho mínimos conferidos.
- [ ] Movimento respeita a preferência do sistema.
- [ ] Print da tela antes e depois, se mudou o visual.
