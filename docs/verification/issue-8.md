# Issue #8: acesso e sessão

Verificação local atualizada em 23/10/2026. Implementa [Entrar no Echo com sessão persistida](https://github.com/caiofsr/echo/issues/8), conforme o refinamento aprovado. Não houve publicação em produção.

## Resultado

- `bun run typecheck`: passou.
- `bun test tests`: 12 testes passaram, com 76 verificações na execução final usando `bun:sqlite`. SQLite real isolado, migrações, persistência após reabrir banco, revogação, cookies, expiração/renovação, limite nativo persistente do Better Auth, concorrência do rate limiter e criação e reaplicação da migration inicial.
- `bun run build`: passou, gerando cliente e servidor do TanStack Start.
- `bun run test:e2e`: 18 testes passaram, em desktop e celular. Entrada inválida/válida, mostrar senha, destino interno, recarga, navegação, saída em múltiplas abas e reentrada após revogação. O limite nativo também foi conferido na interface, com a mensagem de espera em português.
- Railpack 0.43.0: build local inicial da imagem `echo-issue-8`, runtime Bun 1.3.14. Teste com `bun scripts/smoke-image.ts echo-issue-8` passou, incluindo migrações, definição administrativa de senha, cookie seguro, SSR protegido, assets, sessão após reinício do contêiner e saída. Essa validação da imagem antecede a troca para `bun:sqlite`; não foi repetida depois da troca.
- Detector Impeccable: nenhum achado nos componentes, rotas e CSS. Revisão visual real em 1440px, 320px e viewport equivalente ao espaço disponível em zoom de 200%. Os SVGs locais foram validados e inspecionados em branco, cinza e fundo do aplicativo, em 17, 24, 32, 64 e 128px. São versões simplificadas de interface; não são ilustrações 3D.

## Standards

O usuário optou pelo fluxo nativo de redefinição e revogação do Better Auth. O controle de revisão da credencial foi removido, incluindo as colunas correspondentes. A suíte verifica revogação de sessões existentes, recusa da senha antiga, aceitação da nova senha e preservação da sessão quando a nova senha é inválida. A garantia adicional contra login concorrente ao reset deixou de fazer parte do contrato.

## Spec

Revisão independente encontrou dois ajustes: incluir abertura, retorno visível e scroll na atividade que renova a sessão; agregar alterações não salvas por formulário. Ambos foram corrigidos e a revisão confirmou a resolução. A consulta periódica continua passiva e abas em segundo plano não renovam a sessão indefinidamente.

## Revisão visual

A revisão independente apontou a ausência de destaque visual da rota Configurações. O destaque foi aplicado e conferido em desktop e 320px. A revisão da correção recebeu disposição `ship`, restrita ao ajuste avaliado. As capturas da revisão foram removidas do repositório.

A revisão usou o protótipo aprovado e o contrato fornecido; não houve nova rodada de conceitos ou geração de comp. A ausência de seed e QUALITY BAR card foi registrada como lacuna de processo, sem substituir a direção já aprovada.

## Limites

O usuário escolheu SQLite local com bun:sqlite também em produção e removeu o suporte ao Turso/libSQL. Domínio, HTTPS, variáveis e execução no Dokploy ainda precisam ser conferidos no servidor de destino. Os testes locais não constituem essa validação.

Formulários de trabalho e cronômetro operacional pertencem às próximas issues. A infraestrutura de sessão mantém filhos montados durante reentrada, oferece registro de alterações não salvas por formulário e sincroniza saída entre abas. Os próximos formulários devem sinalizar alterações e respostas 401, atualizar dados após reautenticação e exigir confirmação explícita antes de salvar. Não há dados de trabalho fictícios na aplicação.

## Aprofundamento dos módulos de acesso e sessão

O ciclo de sessão no navegador fica em `useSessionLifecycle`, separado da renderização. A comunicação de rascunhos tem vida estável durante expiração e reentrada e anuncia a participação da aba ao restaurar uma página.

Não há hooks customizados do Better Auth. O comando administrativo usa os endpoints nativos de criação inicial e reset, com token restrito à memória daquela execução. O cadastro público fica desativado na configuração nativa; a instância pública não configura envio de reset.

O fixture de integração retorna status e payload nativos, incluindo sessão ausente como JSON `null`. Os testes de navegador usam um formulário temporário com os hooks públicos para verificar retenção do rascunho, confirmação entre abas após reentrada, retorno pelo histórico e desmontagem. A renovação por atividade verifica o avanço real de `expiresAt`; o parâmetro `disableRefresh` é omitido nessa chamada, evitando a coerção de `false` textual para verdadeiro.

## React Query com SSR

A integração oficial `@tanstack/react-router-ssr-query` está conectada em `getRouter`. Os testes usam o roteador real da aplicação no servidor e as funções nativas de SSR/hidratação para conferir isolamento do cache, leitura reaproveitada na hidratação, provider e consultas transmitidas depois do cache inicial. O documento raiz delega o provider à integração oficial.

## Server functions, beforeLoad e consultas de acesso

Os guards de `/_app` e `/login` consultam a mesma query, cuja função chama `hasSession` no servidor. O `staleTime: 0` dessa query impede que os 30 segundos de cache padrão adiem a verificação de uma sessão revogada. As cinco páginas privadas herdam esse guard e permanecem sem consultas fictícias de dados de trabalho.

O teste de navegador adicional verifica redirecionamento SSR de uma sessão autenticada na página de login, revogação seguida de navegação cliente e retorno ao destino após nova entrada. A reautenticação aguarda a invalidação síncrona das rotas antes de reexibir os formulários.

## Simplificações nativas de navegação e observação

Links ativos e `aria-current` são calculados pelo TanStack, com correspondência exata de caminho independente dos parâmetros da URL. As navegações de entrada e saída usam o roteador com recarregamento do documento; a saída substitui a entrada atual do histórico.

O intervalo customizado foi removido. O Better Auth faz consultas passivas a cada 60 segundos, inclusive em segundo plano enquanto há sessão. Os testes conferem que a expiração não avança nessa consulta e que a seleção do menu permanece correta com parâmetros na URL.

## TanStack Store

O estado de interface da sessão e do login usa `@tanstack/react-store`, com instâncias criadas por montagem e seletores específicos. A coordenação de formulários e abas atualiza conjuntos de forma imutável. Recursos do navegador, como BroadcastChannel, permanecem em referências com descarte no efeito. TanStack Form mantém os valores e o envio; React Query mantém dados do servidor.

A suíte de navegador verifica erro e visibilidade da senha, preservação de rascunhos na reentrada, confirmação entre abas e descarte da participação ao desmontar. Build, typecheck, lint, formatação, os 12 testes de integração e os 18 testes de navegador foram executados após a migração.

## Integração direta conforme a documentação do Better Auth

Removidos `handleAuth` e `readSession`. A rota usa o handler nativo e a server function chama `auth.api.getSession` diretamente. O plugin de cookies segue como último plugin. A configuração usa as validações nativas, sem hooks ou reconstrução da resposta HTTP. A configuração não repete os padrões de tamanho máximo de senha e cache de cookie.

Os testes passam pelo handler nativo e pela API do servidor. A cobertura verifica a autorização nativa de listagem de sessões e atualização de usuário, cadastro desativado, tratamento nativo de Origin ausente e recusa de origem externa ou porta diferente. A suíte soma 12 testes e 76 asserções, além dos 18 testes de navegador em desktop e mobile.

## Remoção dos hooks

Removidos todos os hooks customizados e o arquivo `personal-credentials.ts`. A API usa as validações e autorização nativas. Os testes conferem erro nativo para origem externa e credencial inexistente, cadastro público desativado, sessão necessária para listar sessões ou atualizar o usuário e sucesso dessas operações quando autenticado. Clientes sem Origin ou metadados seguem o comportamento padrão do Better Auth. A leitura de sessão mantém o cabeçalho nativo sem cache.

## Redefinição e revogação nativas

`revokeSessionsOnPasswordReset: true` delega a revogação ao Better Auth. A criação inicial usa `signUpEmail` sem sessão automática numa instância apenas administrativa. Para redefinir, o comando captura o token de `requestPasswordReset` em memória e chama `resetPassword`. Validação, hash, gravação da senha, consumo do token e remoção das sessões seguem as implementações nativas. Não há escrita direta de credenciais nem helper de transação customizado.

O histórico anterior foi removido e substituído por `0000_initial.sql`, gerada pelo Drizzle a partir do schema produzido pelo CLI oficial. O teste cria as cinco tabelas, autentica, reaplica a mesma migration e verifica que credencial e sessão permanecem intactas, com apenas uma entrada no histórico. Os testes de revisão e corrida de login foram removidos conforme a decisão pelo fluxo nativo.

O adapter mantém transações assíncronas desativadas, compatível com `bun:sqlite`; a aplicação segue o comportamento nativo de revogar antes de gravar a senha e não promete atomicidade adicional. A revogação não garante impedir uma sessão criada posteriormente por um login concorrente já em andamento.

## Instância de autenticação e pasta do banco

`src/lib/auth.ts` exporta a instância diretamente. Rota e server function importam `auth`; `getAuth`, `src/server/runtime.ts` e a factory de acesso de produção foram removidos. `src/lib/auth-options.ts` compartilha opções declarativas com as instâncias isoladas dos testes. A lógica e a instância administrativa ficam em `scripts/password.ts`; não há módulo de senha em `src/server`. O script só inicializa a aplicação e lê stdin quando executado diretamente, e os testes importam a função administrativa sem executar o comando.

Conexão, abertura/migração e tabelas ficam em `src/db`. O `drizzle.config.ts`, comandos e testes usam os novos caminhos. O preload de testes usa uma conexão em memória para impedir que imports de SSR abram o banco local da aplicação.

O CLI oficial regenerou `src/db/schema.ts` usando `src/lib/auth.ts`, incluindo as relações, índices e padrões nativos. O script `auth:generate` usa essa configuração e direciona a saída para `src/db/schema.ts`. Os testes de integração, navegador, CLI administrativo e os checks foram reexecutados após a reorganização.

## Baseline aplicada ao banco local

As quatro migrations anteriores e seus snapshots foram excluídos. O histórico agora contém apenas `0000_initial`, com as cinco tabelas atuais do Better Auth. O banco local `.data/echo.db` foi removido conforme autorização do usuário e recriado por `bun run db:migrate`. A consulta ao banco confirmou uma migration aplicada e as tabelas `account`, `rate_limit`, `session`, `user` e `verification`. Nenhuma senha foi definida no banco local recriado; o próximo acesso requer executar `bun run auth:password`.
