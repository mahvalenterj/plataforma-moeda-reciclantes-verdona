# Template do projeto Verdona para Claude Code (VS Code)

Mesmo método do projeto UPA: **Grill → spec com critérios de aceite → autoconferência → plano → fatias**, com CLAUDE.md, skills e ADRs mantidos fora do GitHub.

## Como usar

1. Copie o conteúdo desta pasta para a raiz do projeto (por exemplo, a pasta do MVP).
2. Se a pasta ainda não for um repositório, rode `git init`. Depois, na raiz, rode uma vez: `sh scripts/instalar-hooks.sh`. Se aparecer "Hook de pre-commit instalado", conferiu. Se pedir `git init`, faça isso e rode de novo. O hook bloqueia commit de `CLAUDE.md`, `docs/specs`, `docs/adr`, `docs/grill` e `docs/juridico`.
3. Abra no VS Code com o Claude Code. As skills de `.claude/skills/` são carregadas pelo projeto.
4. Comece pelo Grill do design system:
   > Leia `CLAUDE.md` e `docs/grill/grill-001-design-system.md`. Conduza o Grill: uma pergunta por vez, começando pelas de maior risco. Registre minhas respostas e proponha ADRs quando uma decisão fechar.
5. Com o Grill fechado, peça a spec a partir de `docs/specs/000-template-spec.md`, faça a autoconferência, aprove o plano e siga fatia por fatia.

## Skills externas (opcionais)

- **Copy para páginas e campanhas:** `npx skills add coreyhaines31/marketingskills --skill copywriting`
- **UX e interface:** o ranking que consultei citava a `ui-ux-pro-max`, mas não confirmei o comando de instalação. Procure o nome em skills.sh antes de instalar. A `verdona-ux` deste template já cobre o essencial do projeto.

As skills do projeto vencem quando houver conflito de vocabulário, marca ou regra jurídica.

## Mapa

```
CLAUDE.md                         contexto e regras para o Claude Code (local)
.claude/skills/
  verdona-design-system/          tokens, componentes, acessibilidade, movimento
  verdona-ux/                     pessoas, princípios, estados, teste com a Dona Maria
  verdona-copy/                   voz carioca, vocabulário, regras de dinheiro
design-system/
  tokens.json                     fonte da verdade (paleta e semânticos)
  tokens.css                      variáveis CSS, tema por organização, movimento reduzido
  tailwind-preset.js              preset que liga o Tailwind às variáveis
docs/grill/                       Grill 001 (design system) e 002 (Área do Prestador)
docs/specs/                       template de spec e spec 002 (matriz de contrapartidas)
docs/adr/                         template e ADRs 0001 a 0013
docs/juridico/contrapartida-v2.md regra da Versão 2, cláusula proposta e Anexo VI
scripts/                          hook de pre-commit e instalador
```

## Nome

O projeto assume **Verdona** (marca) e **verdona(s)** (unidade), conforme a ADR-0014, com a visão dos seis pilares no CLAUDE.md. O nome ainda precisa do teste em voz alta, do INPI e do advogado. Se mudar, a ADR-0014 é a que se atualiza.

## Pendências conhecidas

- O MVP ainda usa cores fixas no `tailwind.config.js`. Migrar para o preset é uma boa primeira fatia do design system.
- Textos de 11 a 13 px no MVP abaixo do mínimo definido para a Dona Maria.
- A estratégia de banco para testes sem Docker precisa de ADR.
- A meta de MSI do Pitest está em aberto no CLAUDE.md.
- Renomear o MVP (tutu para verdona, bolada para meta do bairro) é a primeira fatia, descrita no CLAUDE.md.
