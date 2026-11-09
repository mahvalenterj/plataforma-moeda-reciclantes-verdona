# Harness de Engenharia de Software com IA

Repositório pessoal que replica um "modo de pensar" em qualquer projeto ou exercício feito com apoio de IA. Baseado nos 4 pilares da engenharia de software moderna com IA:

1. **Ideação livre** (`/grill`) — bater ideia sem compromisso, antes de qualquer coisa virar spec.
2. **Specification-first** (`/specs`) — nada de código antes de escrever o que deve ser feito.
3. **Agente com ferramentas** (`/agents`) — como a IA deve operar: o que pode executar, ler, testar.
4. **Contexto persistente** (`/context`) — memória viva do projeto: decisões, padrões, stack.
5. **Revisão humana no loop** (`/reviews`) — checklist para eu validar antes de aceitar qualquer output.

## Como usar em um novo projeto
1. Copie este repositório (ou use como template no GitHub: *Use this template*).
2. Bata a ideia livremente em `/grill/grill-template.md` (copie um por projeto) até ela ficar sólida.
3. Preencha `/context/architecture.md` e `/context/stack.md`.
4. Formalize a spec em `/specs/` a partir do que amadureceu no grill.
5. Cole `/agents/agent-instructions.md` no início de qualquer sessão com Claude/Cursor/Copilot.
6. Ao final, passe pelo checklist em `/reviews/review-checklist.md`.
7. Apague o arquivo de grill depois que a spec já tiver absorvido o que interessava.

## Estrutura
```
ai-swe-harness/
├── grill/
│   └── grill-template.md
├── specs/
│   └── spec-template.md
├── agents/
│   └── agent-instructions.md
├── context/
│   ├── architecture.md
│   ├── stack.md
│   └── decisions-log.md
├── reviews/
│   └── review-checklist.md
└── .github/
    └── pull_request_template.md
```
