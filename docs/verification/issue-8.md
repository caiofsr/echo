# Issue #8: acesso e sessão

Verificação local em 22/10/2026. Implementa [Entrar no Echo com sessão persistida](https://github.com/caiofsr/echo/issues/8), conforme o refinamento aprovado. Não houve publicação em produção.

## Resultado

- `bun run typecheck`: passou.
- `bun test tests`: 7 testes passaram, com 37 verificações na execução final usando `bun:sqlite`. SQLite real isolado, migrações, persistência após reabrir banco, revogação, cookies, expiração/renovação, limites, concorrência e rollback de escritas atômicas.
- `bun run build`: passou, gerando cliente e servidor do TanStack Start.
- `bun run test:e2e`: 6 testes passaram, em desktop e celular. Entrada inválida/válida, mostrar senha, destino interno, recarga, navegação, saída em múltiplas abas e reentrada após revogação.
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

Turso remoto foi adiado pelo usuário. Domínio, HTTPS, variáveis e execução no Dokploy ainda precisam ser conferidos no servidor de destino. Os testes locais não constituem essa validação.

Formulários de trabalho e cronômetro operacional pertencem às próximas issues. A infraestrutura de sessão mantém filhos montados durante reentrada, oferece registro de alterações não salvas por formulário e sincroniza saída entre abas. Os próximos formulários devem sinalizar alterações e respostas 401, atualizar dados após reautenticação e exigir confirmação explícita antes de salvar. Não há dados de trabalho fictícios na aplicação.
