# Checklist de Revisão Humana

Antes de aceitar qualquer código gerado por IA, confirme:

## Corretude
- [ ] O código resolve exatamente o que a spec pedia?
- [ ] Casos de borda da spec foram tratados?
- [ ] Testes existem e passam?

## Legibilidade
- [ ] Eu entendo cada linha sem precisar perguntar "o que isso faz"?
- [ ] Nomes de variáveis/funções são claros?
- [ ] Não há complexidade desnecessária ("over-engineering")?

## Alinhamento arquitetural
- [ ] Segue os padrões de `/context/architecture.md`?
- [ ] Usa a stack definida em `/context/stack.md`?
- [ ] Se desviou de algum padrão, isso foi registrado em `decisions-log.md`?

## Segurança e qualidade
- [ ] Sem segredos/credenciais hardcoded
- [ ] Tratamento de erros presente
- [ ] Sem dependências desnecessárias adicionadas

## Antes do commit
- [ ] Mensagem de commit segue a convenção definida
- [ ] Documentação/README atualizados se necessário
