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

`SessionBoundary` mantém seus filhos montados e ocultos durante reentrada, preservando estado React somente na memória daquela aba. Após autenticar, limpa consultas e invalida os dados do roteador sem enviar formulários. Formulários protegidos devem usar `useUnsavedChanges`, sinalizar respostas 401 com `useSession().expire()` e exigir ação explícita para salvar após atualizar os dados. Sair pede confirmação de alterações sinalizadas nesta ou em outra aba e encerra todas as abas do navegador por BroadcastChannel. Não altera sessões de outros dispositivos.

Não há formulários de trabalho nem cronômetro operacional nesta issue. Essas entregas devem integrar a proteção de sessão sem parar o cronômetro quando o acesso expira ou termina.
