# Organização do código

| Pasta                   | Responsabilidade                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib`               | Instâncias e clientes de bibliotecas: `auth.ts` e `auth-client.ts`.                                                                               |
| `src/config`            | Opções declarativas de Better Auth e React Query e validação do ambiente do servidor.                                                             |
| `src/db`                | Conexão da aplicação, abertura/migração do SQLite e schema gerado pelo Better Auth.                                                               |
| `src/server/functions`  | RPCs definidas com `createServerFn`, incluindo a leitura de sessão. Essas funções são chamadas do cliente através do mecanismo do TanStack Start. |
| `src/queries`           | `queryOptions` do React Query, com chave, função de consulta e política de cache.                                                                 |
| `src/hooks`             | Ciclo de sessão da interface e registro de alterações não salvas.                                                                                 |
| `src/contexts`          | Contextos tipados que compartilham ações com a árvore de componentes.                                                                             |
| `src/components/auth`   | Formulário de login e interface de reautenticação.                                                                                                |
| `src/components/layout` | Estrutura e navegação da aplicação.                                                                                                               |
| `src/components/ui`     | Componentes visuais reutilizáveis e SVGs da interface.                                                                                            |
| `src/routes`            | Rotas do TanStack, guards de navegação e handlers HTTP.                                                                                           |
| `scripts`               | Comandos administrativos, incluindo migração e definição da senha.                                                                                |
| `tests/helpers`         | Instâncias de bibliotecas e bancos isolados para os testes.                                                                                       |

O `src/router.tsx` permanece no lugar esperado pelo TanStack Start. Ele cria um QueryClient por roteador usando as opções de `src/config/react-query.ts`; a integração oficial fornece provider, hidratação e streaming.

`src/lib/auth.ts` exporta a instância pública diretamente. `src/config/auth.ts` contém opções compartilháveis, sem conexão ou segredo. O script de senha pode usar essas opções em sua instância administrativa local, sem introduzir esse fluxo no servidor HTTP.

Server functions devem ler cabeçalhos e autorizar acesso dentro de `.handler()`. O `beforeLoad` controla a navegação, mas não substitui a autorização de consultas e mutações privadas. O catálogo atual contém somente a leitura de sessão; não há serviços ou pastas vazias para funcionalidades futuras.

A aplicação delega estado autenticado ao Better Auth, valores/envio/erros do formulário ao TanStack Form e dados do servidor ao React Query. O TanStack Store mantém estado de interface e coordenação de alterações não salvas. Evite copiar esses estados entre bibliotecas.

O React Compiler realiza a memoização no cliente. A sincronização com eventos externos usa `useEffectEvent`, e o registro de formulários recebe um ref callback com cleanup do React 19. Os dois efeitos restantes pertencem ao ciclo de sessão; não substitua sua sincronização externa por mutações durante render.
