# Issue #8: acesso e sessão

Verificação local em 22/10/2026. Implementa [Entrar no Echo com sessão persistida](https://github.com/caiofsr/echo/issues/8), conforme o refinamento aprovado. Não houve publicação em produção.

## Resultado

- `bun run typecheck`: passou.
- `bun test tests`: 12 testes passaram, com 59 verificações na execução final usando `bun:sqlite`. SQLite real isolado, migrações, persistência após reabrir banco, revogação, cookies, expiração/renovação, limite nativo persistente do Better Auth, concorrência e rollback de escritas atômicas.
- `bun run build`: passou, gerando cliente e servidor do TanStack Start.
- `bun run test:e2e`: 18 testes passaram, em desktop e celular. Entrada inválida/válida, mostrar senha, destino interno, recarga, navegação, saída em múltiplas abas e reentrada após revogação. O limite nativo também foi conferido na interface, com a mensagem de espera em português.
- Railpack 0.43.0: build local inicial da imagem `echo-issue-8`, runtime Bun 1.3.14. Teste com `bun scripts/smoke-image.ts echo-issue-8` passou, incluindo migrações, definição administrativa de senha, cookie seguro, SSR protegido, assets, sessão após reinício do contêiner e saída. Essa validação da imagem antecede a troca para `bun:sqlite`; não foi repetida depois da troca.
- Detector Impeccable: nenhum achado nos componentes, rotas e CSS. Revisão visual real em 1440px, 320px e viewport equivalente ao espaço disponível em zoom de 200%. Os SVGs locais foram validados e inspecionados em branco, cinza e fundo do aplicativo, em 17, 24, 32, 64 e 128px. São versões simplificadas de interface; não são ilustrações 3D.

## Standards

Revisão independente encontrou uma corrida entre entrada e redefinição de senha. O teste público concorrente reproduziu acesso válido pela credencial anterior após a redefinição. A correção associa cada sessão a uma versão da credencial, confirma essa versão atomicamente antes de devolver o cookie e verifica a associação a cada autorização. A revisão confirmou a resolução e não encontrou outro problema material.

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

A regra de revisão da credencial fica em `personalCredentials`, integrada pelos hooks nativos do Better Auth. Leituras HTTP e do servidor rejeitam sessões sem revisão confirmada. O teste concorrente agora pausa a escrita real da sessão após a verificação nativa da senha, redefine a senha pelo mesmo caminho administrativo e libera a escrita: o login pendente retorna 401 e não mantém sessão.

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

Removidos `handleAuth` e `readSession`. A rota usa o handler nativo e a server function chama `auth.api.getSession` diretamente. O plugin de cookies segue como último plugin. Restrições adicionais do Echo ficam nos hooks, sem recriar a resposta HTTP. A configuração não repete os padrões de tamanho máximo de senha e cache de cookie.

Os testes passam pelo handler nativo e pela API do servidor. A cobertura de política verifica também endpoints de listagem de sessões e atualização de usuário, Origin ausente e a mesma origem com porta diferente. A suíte soma 12 testes e 63 asserções, além dos 18 testes de navegador em desktop e mobile.
