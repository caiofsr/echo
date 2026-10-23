# Echo

Aplicação pessoal para trabalho freelancer. Esta primeira entrega implementa acesso e sessão, com a navegação aprovada em português. Quadro, Horas, Faturas, Cadastros, Configurações e cronômetro mostram estados de indisponibilidade enquanto aguardam suas próximas issues.

## Desenvolvimento

Requer Bun **1.3.14**. Dependências são fixadas em `bun.lock`.

```sh
bun install --frozen-lockfile
cp .env.example .env
# Preencha BETTER_AUTH_SECRET com um segredo gerado localmente:
openssl rand -base64 48
bun run db:migrate
# Leia a senha sem mostrá-la nem colocá-la nos argumentos/histórico:
read -rs 'echo_password?Senha pessoal: '; printf '\n'
printf '%s' "$echo_password" | bun run auth:password
unset echo_password
bun run dev
```

O exemplo de leitura da senha usa zsh, shell do ambiente de desenvolvimento. Em outro shell, use sua leitura silenciosa equivalente. A senha deve ter de 15 a 1024 caracteres, aceita espaços e não exige composição específica. Não há senha padrão nem cadastro público. A operação `auth:password` também redefine a senha e revoga todas as sessões, preservando os demais dados. Execute-a apenas administrativamente no servidor, com o mesmo banco e segredo da aplicação. Não passe a senha em argumentos ou arquivos versionados.

`DATABASE_URL=file:.data/echo.db` usa SQLite persistente local com o driver nativo `bun:sqlite` e o adaptador `drizzle-orm/bun-sqlite`. Chaves estrangeiras e WAL são habilitados na conexão. Desenvolvimento e produção usam esse mesmo driver; no Dokploy, configure um caminho absoluto em volume persistente, como `file:/data/echo.db`. Nunca versione `.env` ou arquivos de banco.

## Build e execução

```sh
bun run build
bun run start
```

O build gera `dist/client` e `dist/server/server.js`. `server.ts` usa `Bun.serve`, serve apenas os arquivos estáticos conhecidos em `dist/client` e encaminha requisições dinâmicas ao TanStack Start. Escuta `0.0.0.0` na porta `PORT`, com padrão 3000. É preciso instalar dependências também na imagem final; o servidor SSR importa pacotes de `node_modules`.

## Verificação

```sh
bun run typecheck
bun test tests
bunx playwright install chromium
bun run build
bun run test:e2e
```

Os testes de acesso usam SQLite real em diretórios temporários, migrações reais, cookies e operações públicas de entrada, consulta, atividade, saída e redefinição administrativa. O relógio é controlado para testar 30 dias sem esperas reais. Nenhum teste depende de um banco remoto ou do banco pessoal.

O Playwright testa o artefato compilado em desktop e celular. `scripts/e2e-server.ts` cria e remove um banco isolado. Seu controle administrativo de teste, quando habilitado, escuta somente `127.0.0.1:4319`; esse processo não faz parte do servidor de produção. A porta da aplicação de teste é 4318.

## Dokploy e Railpack

Sem Dockerfile. Configure Railpack e preserve o comando `bun run start` do `package.json`, que executa explicitamente o runtime Bun. Fixe a versão 1.3.14. `.dockerignore` exclui segredos, bancos, dependências locais e saídas de build do contexto enviado.

Em produção, configure:

- `NODE_ENV=production`.
- `BETTER_AUTH_URL=https://seu-dominio`, exatamente a origem pública, sem caminho.
- `BETTER_AUTH_SECRET` estável, aleatório e com pelo menos 32 caracteres.
- `DATABASE_URL=file:/data/echo.db`, apontando para o volume persistente.
- `PORT=3000`, ou a porta configurada no serviço.

Antes da primeira inicialização, aplique `bun run db:migrate` no ambiente de destino e defina a senha com `bun run auth:password`. Monte um volume persistente e use um caminho absoluto como `file:/data/echo.db`. Crie previamente o diretório do volume e garanta permissão de escrita. Use uma única instância, sem múltiplas réplicas independentes com arquivos SQLite diferentes. Migrações não são executadas automaticamente a cada requisição.

O proxy deve terminar HTTPS e encaminhar à porta interna da aplicação. Cookies de produção usam Secure, HttpOnly e SameSite=Lax. Operações de escrita verificam a origem exata. Páginas e respostas de sessão usam `Cache-Control: no-store`; não habilite cache de proxy para conteúdo dinâmico.

A entrada HTTP substitui qualquer `x-echo-client-ip` recebido pelo endereço real da conexão: `server.ts` em produção e o middleware do Vite em desenvolvimento. A rota de autenticação apenas encaminha a requisição ao serviço de acesso, sem extrair ou repassar o IP separadamente. Cabeçalhos de IP encaminhados pelo proxy não são confiados automaticamente. Atrás do Dokploy, conexões do mesmo proxy compartilham o limite de cinco tentativas por minuto, suficiente para este aplicativo pessoal. O rate limiter nativo do Better Auth usa `storage: "database"` e a tabela SQLite `rate_limit`. A espera é temporária e persistida no banco, sem bloqueio permanente; consultas de sessão e saída não consomem o limite de entrada. A interface traduz a resposta 429 usando `X-Retry-After`. A migração `0002_native_rate_limit` cria essa tabela e remove a antiga `login_attempt`; execute `bun run db:migrate` antes de iniciar a versão atualizada.

Para reproduzir a validação local da imagem, com Docker e um BuildKit disponíveis:

```sh
docker run --rm --privileged -d --name echo-buildkit moby/buildkit
BUILDKIT_HOST=docker-container://echo-buildkit railpack build . --name echo-issue-8
bun scripts/smoke-image.ts echo-issue-8
docker stop echo-buildkit
```

O teste usa banco, senha e segredo temporários, verifica entrada, cookie seguro, página protegida, assets, persistência após reiniciar o contêiner e saída. O entrypoint padrão da imagem Railpack é `/bin/bash -c`; comandos administrativos com `docker run` precisam de `--entrypoint bun`, como feito no script.

Ainda deve ser conferido no servidor Dokploy: versão disponível do Railpack, domínio e HTTPS, variáveis, volume/permissões quando aplicável, execução de migrações, inicialização e sessão entre visitas. Esta entrega não publica em produção. A política de backup continua adiada.

## Formulários das próximas entregas

`SessionBoundary` mantém seus filhos montados e ocultos durante reentrada, preservando estado React somente na memória daquela aba. Após autenticar, limpa consultas e invalida os dados do roteador sem enviar formulários. Formulários protegidos devem usar `useUnsavedChanges`, sinalizar respostas 401 com `useSession().expire()` e exigir ação explícita para salvar após atualizar os dados. Sair pede confirmação de alterações sinalizadas nesta ou em outra aba e encerra o acesso em todas as abas daquele navegador pela notificação nativa de saída do Better Auth. O BroadcastChannel do Echo comunica apenas alterações não salvas. A sessão é observada por `authClient.useSession()`; consultas automáticas não renovam a validade, e somente eventos de atividade em aba visível solicitam renovação. Não altera sessões de outros dispositivos.

Não há formulários de trabalho nem cronômetro operacional nesta issue. Essas entregas devem integrar a proteção de sessão sem parar o cronômetro quando o acesso expira ou termina.

## Organização da sessão

`useSessionLifecycle` concentra as transições de acesso, atividade visível e limpeza das consultas. A comunicação de alterações não salvas permanece montada durante expiração e reentrada; ao desmontar ou restaurar uma página, a participação da aba é atualizada. `SessionBoundary` renderiza esse estado e mantém os formulários montados.

`personalAccessHooks` concentra apenas a superfície HTTP, a exigência de Origin explícito e a identidade pessoal. O comando `auth:password` cria a conta inicial por `signUpEmail`, sem sessão automática. Para uma conta existente, chama `requestPasswordReset` e `resetPassword`, com `revokeSessionsOnPasswordReset: true`. O token fica somente na memória do comando; nenhum email é enviado e os endpoints de reset permanecem bloqueados no servidor público.

A revogação segue o comportamento nativo do Better Auth. Não existe revisão customizada da credencial nem garantia adicional contra um login concorrente que crie uma sessão depois do reset. O adapter Drizzle com `bun:sqlite` mantém transações assíncronas desativadas; não há promessa de atomicidade adicional ao fluxo nativo.

O cliente mantém `fetchOptions.query.disableRefresh: true` como padrão. Atividade visível sobrescreve o valor com `undefined`, omitindo o parâmetro para solicitar renovação. Nesta versão do Better Auth, a string `false` na URL também é convertida para verdadeiro.

Os testes de integração observam as respostas nativas sem transformar status ou payload. O servidor isolado dos testes de navegador gera um formulário temporário em `dist/client/__tests__` para exercitar os hooks públicos e remove esses arquivos ao encerrar; esse formulário não faz parte do build da aplicação.

## React Query e SSR

`getRouter` cria um `QueryClient` por requisição SSR e conecta a integração oficial `@tanstack/react-router-ssr-query`. Ela fornece o provider e transfere o cache inicial e consultas em streaming para o navegador. O documento raiz não mantém um segundo provider.

Consultas usam `staleTime` padrão de 30 segundos, que cada consulta pode sobrescrever. `defaultPreloadStaleTime: 0` deixa a decisão de atualização com o React Query. Limpeza de cache na saída e reautenticação continua usando esse mesmo cliente.

Os testes verificam isolamento entre roteadores, hidratação sem repetir a leitura, disponibilidade do provider e transferência de uma consulta iniciada após a desidratação inicial.

## Carregamento das páginas

`/login` e `/_app` usam `beforeLoad` com `context.queryClient.fetchQuery(accessQueryOptions)`. A query chama a server function `hasSession`, que consulta a sessão no servidor sem renovar sua validade. Essa query sobrescreve o padrão global com `staleTime: 0`: cada navegação confirma o acesso atual, inclusive após uma revogação ou preload. A query compartilha chamadas em andamento e participa da integração SSR.

Quadro, Horas, Faturas, Cadastros e Configurações herdam o guard de `/_app`. Essas páginas ainda apresentam placeholders e não precisam de loaders ou consultas de dados de trabalho. Quando esses dados existirem, as leituras privadas devem ser autorizadas dentro das server functions e consumidas por query options compartilhadas entre loader e tela. O guard de navegação não substitui autorização no servidor.

Login, logout e observação da sessão continuam no SDK nativo do Better Auth. Após reautenticação, o ciclo de sessão limpa o cache e aguarda `router.invalidate({ sync: true })` antes de mostrar os formulários novamente.

A seleção do menu usa `Link.activeOptions` e `activeProps`; `aria-current` é fornecido pelo TanStack. Entrada e saída usam `router.navigate` com `reloadDocument: true`, preservando o recarregamento e a substituição do histórico na saída. O polling de sessão usa `sessionOptions.refetchInterval: 60` do Better Auth. Ele pode consultar em segundo plano enquanto houver sessão, sempre com `disableRefresh: true`; somente os eventos de atividade em aba visível solicitam renovação.

### Estado de interface com TanStack Store

`@tanstack/react-store` gerencia status de acesso, erros de conexão, registro de formulários alterados, participação de outras abas e última atividade. Cada `SessionBoundary` cria seu store com `useCreateStore`; o contexto nativo compartilha a instância e as ações com os descendentes. Não existe store global entre requisições SSR. Seletores observam apenas os campos exibidos, e os conjuntos de alterações recebem atualizações imutáveis.

Cada `LoginForm` também cria um store para erro e visibilidade da senha. Valor da senha e envio continuam no TanStack Form; dados do servidor ficam no React Query e a sessão autenticada continua sob responsabilidade do Better Auth. Os rascunhos dos próximos formulários permanecem nos respectivos formulários; o Store registra quais têm alterações não salvas.

### Integração direta do Better Auth

A rota `/api/auth/$` encaminha GET e POST diretamente para `auth.handler`, conforme a [integração oficial com TanStack Start](https://better-auth.com/docs/integrations/tanstack). A server function de acesso chama `auth.api.getSession` com os cabeçalhos da requisição; os guards continuam no `beforeLoad`, usando a consulta compartilhada do React Query. `tanstackStartCookies()` permanece como último plugin.

Não há wrapper HTTP ou reconstrução da resposta do Better Auth. Os hooks concentram as restrições do Echo: endpoints pessoais publicados, Origin explícito obrigatório nos POSTs, respostas sem cache. O limite máximo de senha e a desativação do cache de cookie usam os padrões da biblioteca.

A validação do valor de Origin usa a proteção nativa do Better Auth e a origem derivada de `baseURL`. `disableOriginCheck: false` mantém essa validação ativa também em testes, pois a biblioteca a desativa por padrão nesse ambiente. Credenciais inexistentes recebem o erro nativo de login. O hook conserva apenas a exigência de Origin explícito, a identidade pessoal, a lista de endpoints publicados.

A migração `0003_remove_credential_revision` remove as colunas de revisão de usuário e sessão, preservando as credenciais e sessões existentes. Execute `bun run db:migrate` antes de iniciar a versão atualizada.
