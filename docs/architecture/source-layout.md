# Organização do código

| Pasta                   | Responsabilidade                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib`               | Instâncias e clientes de bibliotecas, além de tipos e validadores compartilhados e seguros para o cliente.                                          |
| `src/config`            | Opções declarativas de Better Auth e React Query e validação do ambiente do servidor.                                                             |
| `src/db`                | Conexão da aplicação, abertura/migração do SQLite e schema de autenticação e dados da aplicação.                                                  |
| `src/server`            | Operações de dados e validações de domínio executadas somente no servidor.                                                                         |
| `src/server/functions`  | RPCs definidas com `createServerFn`, incluindo sessão e operações protegidas de configurações. O TanStack Start as expõe ao cliente.              |
| `src/queries`           | `queryOptions` do React Query, com chave, função de consulta e política de cache.                                                                 |
| `src/hooks`             | Reautenticação, saída e registro de alterações não salvas.                                                                                        |
| `src/contexts`          | Contexto de proteção de rascunhos, sem cópia da sessão autenticada.                                                                               |
| `src/components/auth`   | Formulário de login e interface de reautenticação.                                                                                                |
| `src/components/layout` | Estrutura e navegação da aplicação.                                                                                                               |
| `src/components/ui`     | Componentes visuais reutilizáveis e SVGs da interface.                                                                                            |
| `src/routes`            | Rotas do TanStack, guards de navegação e handlers HTTP.                                                                                           |
| `scripts`               | Comandos administrativos, incluindo migração e definição da senha.                                                                                |
| `tests/helpers`         | Instâncias de bibliotecas e bancos isolados para os testes.                                                                                       |

O `src/router.tsx` permanece no lugar esperado pelo TanStack Start. Ele cria um QueryClient por roteador usando as opções de `src/config/react-query.ts`; a integração oficial fornece provider, hidratação e streaming.

`src/lib/auth.ts` exporta a instância pública diretamente. `src/config/auth.ts` contém opções compartilháveis, sem conexão ou segredo. O script de senha pode usar essas opções em sua instância administrativa local, sem introduzir esse fluxo no servidor HTTP. `src/lib/settings-types.ts` e `settings-input.ts` mantêm os formatos compartilhados das configurações sem importar código do banco para a interface.

Server functions devem ler cabeçalhos e autorizar acesso dentro de `.handler()`. O `beforeLoad` controla a navegação, mas não substitui a autorização de consultas e mutações privadas. `src/server/settings.ts` concentra validação e persistência da empresa e dos dados de pagamento; as funções RPC verificam a sessão antes de chamar esse serviço.

A aplicação delega estado autenticado ao Better Auth, valores/envio/erros do formulário ao TanStack Form e dados do servidor ao React Query. O TanStack Store mantém estado de interface e coordenação de alterações não salvas. Evite copiar esses estados entre bibliotecas.

O React Compiler realiza a memoização no cliente. A sincronização com eventos externos usa `useEffectEvent`, e o registro de formulários recebe um ref callback com cleanup do React 19. Os efeitos conectam recursos externos com cleanup por montagem; não substitua essa sincronização por mutações durante render.

`ReauthenticationBoundary` compõe `useReauthentication` e `useUnsavedDrafts`, mantendo os formulários montados durante a reentrada. `useDraftProtection` compartilha apenas registro e confirmação de rascunhos. Componentes com ação de saída usam `useSignOut`; o estado de envio/erro pertence ao `useMutation` do React Query. A atualização da sessão e a notificação entre abas continuam no Better Auth, e os guards e invalidações permanecem no TanStack Router/Start. O Echo mantém apenas as regras de atividade visível e proteção dos rascunhos.
