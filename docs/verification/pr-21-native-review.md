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

## Componentes oficiais do shadcn/ui

O CLI oficial inicializou `components.json` com `base-nova` e gerou Button e Input usando os primitives do Base UI. A adaptação altera estilos, preservando a API e o comportamento desses componentes. A navegação para Configurações usa `Link` com `buttonVariants`, sem `asChild` ou um botão envolvendo o link.

A comparação visual em 1440, 390 e 320 px preservou posição, dimensões, cores, tamanho de fonte e bordas dos controles do login e cabeçalho. As capturas foram produzidas com banco isolado de teste. O tema mantém a fonte do sistema, a paleta do Echo, os SVGs próprios e os textos em português. Radix Slot e as dependências diretas de clsx e tailwind-merge foram removidos; o componente gerado usa `cn`.

O detector visual apontou seis avisos consultivos em cores e tamanhos já presentes antes desta alteração. Eles foram mantidos para preservar o visual solicitado. Não houve achados novos nos componentes TSX.

## Sincronização de sessão e navegação

O login retornava 200 e abria a aplicação, mas o recarregamento e consultas concorrentes de sessão podiam interromper requisições. A solução atual usa navegação cliente e remove `disableSignal`.

O formulário assina `useSession()` e aguarda seu `refetch()` no callback de sucesso do Better Auth, antes de continuar. A página invalida a query de acesso e aguarda `router.invalidate({ sync: true })`; o `beforeLoad` consulta a sessão atual e encaminha ao destino validado. Isso evita que a fronteira de sessão receba o estado antigo após uma revogação. A reentrada mantém os formulários montados até a invalidação das rotas. A saída limpa o cache e navega com substituição de histórico, sem recarregar a página.

Montar a fronteira apenas observa a sessão. Somente atividade real em aba visível pode renovar, e eventos de atividade não iniciam consultas concorrentes com uma leitura nativa pendente.

A suíte de navegador verifica ausência de navegação de documento no login, conclusão das leituras passivas, consultas sem cancelamento e preservação do documento na saída em duas abas. Os testes existentes cobrem destino interno, sessão após recarga manual, reentrada após revogação, rascunhos, polling e renovação por atividade. Resultado: 20 testes de navegador e 12 de integração passaram, além de build, tipos, lint e formatação. Os casos de login e revogação passaram em 12 execuções adicionais em desktop e mobile.

A reprodução em Vite, em 1440 e 390 px com banco isolado, confirmou entrada e saída sem requisições abortadas ou recarga do documento. Ao encerrar o navegador de teste, o adaptador registrou um `AbortError`; esse cancelamento de encerramento continua separado do fluxo de autenticação. Nenhum filtro global de erros foi adicionado.

A [investigação do cancelamento no servidor](tanstack-client-disconnect.md) isolou o registro de encerramento no `createServerEntry` do TanStack, também na última versão publicada. A correção oficial está na PR TanStack/router#8536, ainda aberta na data da investigação. Não foi adicionado tratamento customizado.

## Separação da reautenticação e dos rascunhos

O contexto genérico de sessão e `useSessionLifecycle` foram removidos. `useDraftProtection` compartilha apenas presença de alterações não salvas e confirmação de descarte; `useUnsavedDrafts` mantém esse registro e o canal `echo-drafts`. Valores dos formulários e dados da sessão não são copiados para esse contexto.

`useReauthentication` observa `authClient.useSession()` e mantém somente os bloqueios de interface para reentrada e restauração. A reentrada continua fechada até autenticar explicitamente e invalidar as rotas, inclusive se uma página restaurada encontrar uma sessão válida criada por outra aba. `ReauthenticationBoundary` mantém os formulários montados e ocultos durante esse processo.

`useSignOut` delega envio e erro a `useMutation` do React Query, chamando o SDK do Better Auth. A saída confirmada limpa o cache e navega pelo TanStack, e a notificação nativa `signout` faz as outras abas saírem. O listener é necessário para distinguir saída explícita, que descarta rascunhos, de expiração ou revogação, que preserva rascunhos para reentrada. Não existe protocolo próprio para comunicar autenticação.

Os 22 testes de navegador passaram em desktop e mobile. A cobertura adicional verifica falha de saída com nova tentativa, cancelamento e confirmação do descarte entre abas, descarte dos formulários após confirmação e manutenção da reentrada após restauração de página. Os 12 testes de integração, tipos, lint, formatação e build também passaram.
