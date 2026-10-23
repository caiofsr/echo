# Revisão de recursos nativos e organização da PR 21

Base da revisão: `main`, commit `2451354a72465fb715339c84276f9804d003faee`. A análise considera a issue 8 e as decisões posteriores do usuário nesta conversa, que substituem os requisitos antigos de hooks e revisão de credencial.

## Standards

A revisão independente identificou duas opções redundantes do Better Auth e uma interface de contexto sem consumidores. As correções removem `rememberMe: true`, delegam Secure cookies à inferência nativa de HTTPS e retiram `expire` e a exposição do store do contexto público. O estado continua no TanStack Store, isolado por montagem. A configuração de ambiente ainda exige HTTPS em produção.

A mistura de navegação e placeholder no mesmo módulo foi separada. Configurações, queries, hooks, contexto, componentes de autenticação e server functions agora têm pastas explícitas. A instância padrão continua em `src/lib/auth.ts`, como solicitado.

Esses achados eram simplificações e problemas de clareza, não violações materiais adicionais das convenções documentadas. Os checks automatizados cobrem formatação e tipos.

## Spec

A revisão independente não encontrou requisito ativo ausente no fluxo de autenticação, guards, consultas e SSR. Foi aplicada uma simplificação adicional: erros de envio do login passam a usar `form.setErrorMap` e o estado de erros do TanStack Form, em vez de um campo duplicado no Store. A visibilidade da senha continua no Store. A autenticação permanece em `onSubmit`, sem efeito colateral em validator.

A renovação por atividade visível e a confirmação de rascunhos entre abas permanecem porque são regras explícitas do Echo. O Better Auth gerencia polling, reconexão, sessão e saída entre abas; ele não conhece os formulários da aplicação. O destino de retorno continua limitado às páginas internas admitidas.

Nenhum hook customizado de autenticação foi reintroduzido. A instância administrativa continua restrita ao script de senha e o histórico continua com uma única migration inicial.

## Validação

A suíte de navegador também passou a aguardar a conclusão da consulta inicial por atividade antes de simular reconexão. O trace da falha mostrou uma consulta passiva abortada pela consulta inicial concorrente; o teste não dependia de uma garantia de ordenação da biblioteca. A correção sincroniza as etapas pelos eventos HTTP reais, sem alterar o ciclo de sessão da aplicação ou acrescentar esperas fixas.

Resultado final: 12 testes de integração, 76 asserções, 18 testes de navegador em desktop e mobile, build, typecheck, lint e formatação passaram. O CLI oficial gerou um schema temporário com a configuração reorganizada. O comando de senha passou em criação inicial, redefinição e validação em português. O schema do projeto e o banco local não foram recriados nesta revisão.
