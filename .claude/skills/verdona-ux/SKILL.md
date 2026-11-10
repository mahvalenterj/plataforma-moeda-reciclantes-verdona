---
name: verdona-ux
description: Use ao desenhar ou revisar fluxos, telas, estados, mensagens de erro, acessibilidade e testes com usuários do Verdona (participante, neta, comerciante, coletor, prestador e coordenação).
---

# UX do Verdona

## Para quem desenhamos

| Pessoa | Contexto | O que importa |
|---|---|---|
| Dona Maria, titular | Mais de 60 anos, pouca familiaridade com apps | Letra grande, uma ação por tela, saber quanto tem e onde vale |
| Júlia, perfil delegado | Neta adolescente, rápida no celular | Pagar sem travar, entender o limite dela |
| Seu Osvaldo, comerciante | Caixa com fila, pressa | Cobrar em poucos toques e ter certeza de que recebe |
| Marcos, coletor | Na rua, sol, luva, internet ruim | Botões grandes, funcionar offline, foto rápida |
| Prestadores externos | Prospecção e ativação | Saber o que é cobrado deles e ter a ferramenta para isso |
| Coordenação | Gestão | Ver tudo, validar rápido, auditar |

## Princípios
1. **Uma ação principal por tela.** O resto é secundário ou some.
2. **Dinheiro pede confirmação explícita.** Pagar mostra quem cobra, quanto, e o mesmo preço do dinheiro.
3. **Sempre dizer onde o verdona vale**, perto do saldo. Nunca sugerir saque.
4. **Feedback imediato:** resposta visual em menos de 100 ms. Push em até 2 s.
5. **Erro explica o que houve e como resolver**, sem culpar a pessoa.
6. **Offline primeiro para o coletor:** registra sem internet e sincroniza depois, mostrando o que está pendente.
7. **Sem gesto escondido** nem ícone sem rótulo nas telas da Dona Maria.
8. **Contrato vira tela:** toda obrigação de prestador tem o recurso no sistema (ADR-0012).

## Estados obrigatórios de toda tela
Vazio (o que fazer primeiro), carregando, erro (com saída), sucesso (com próximo passo) e sem conexão.

## Anti-padrões proibidos
- Urgência falsa, contagem regressiva ou pressão para gastar.
- Ranking com nome de criança. Use apelido.
- Gamificação que premia só volume (ADR-0013).
- Pedir dado que não é usado.
- Registrar horas de prestador como controle de jornada.

## Teste de corredor com a Dona Maria
Cinco tarefas, sem ajuda, observando onde ela trava:
1. Dizer quanto tem de verdona e onde pode gastar.
2. Encontrar a última entrega no extrato.
3. Pagar uma cobrança de R$ 35,00.
4. Entender por que uma entrega foi recusada.
5. Pedir uma coleta.
Medir: concluiu sim ou não, tempo, número de toques errados e frases de dúvida.

## Antes de terminar
- [ ] Os cinco estados existem.
- [ ] Ação principal clara e única.
- [ ] Textos passaram pela skill `verdona-copy`.
- [ ] Funciona com fonte grande do sistema e leitor de tela.
- [ ] Nada sugere saque ou conversão do verdona.
