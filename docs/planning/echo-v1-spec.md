## Problem Statement

O usuário precisa organizar seu trabalho freelancer, registrar o tempo efetivo e cobrar clientes sem reconstruir períodos e valores em ferramentas separadas. Deve conseguir trabalhar pelo computador e celular, manter um único trabalho em andamento e preservar o histórico que sustenta cada fatura.

## Solution

Construir a primeira versão do Echo como webapp pessoal responsivo, protegido por uma senha única, com quadro global de tarefas, cronômetro global, registros de horas, timesheet e faturas. A interface será em português. A aplicação compartilhará os mesmos dados entre dispositivos e preservará os dados financeiros das faturas emitidas.

A organização visual segue o protótipo aprovado, variante B, com navegação no topo. Quadro é a tela inicial. A navegação oferece Quadro, Horas, Faturas e Cadastros; Configurações reúne preferências, empresa e dados de pagamento. A implementação final usa shadcn/ui.

## User Stories

1. Como usuário pessoal, quero acessar o Echo com minha senha única, para proteger meus dados de trabalho.
2. Como usuário pessoal, quero manter uma sessão durante o uso habitual, para não precisar entrar novamente a cada visita.
3. Como usuário pessoal, quero acessar os mesmos dados pelo computador e celular, para continuar meu trabalho entre dispositivos.
4. Como usuário pessoal, quero usar a interface em português, para realizar minhas atividades no idioma escolhido.
5. Como usuário pessoal, quero configurar meu fuso horário, com America/Recife como padrão, para interpretar datas e períodos corretamente.
6. Como usuário pessoal, quero configurar um valor de hora padrão e sua moeda, para iniciar registros sem preencher esses dados repetidamente.
7. Como usuário pessoal, quero cadastrar clientes com nome de exibição, para organizar meus projetos.
8. Como usuário pessoal, quero informar os dados opcionais de faturamento de cada cliente, para usá-los nas faturas.
9. Como usuário pessoal, quero cadastrar projetos vinculados a um cliente, para separar meus trabalhos.
10. Como usuário pessoal, quero configurar o valor de hora e a moeda de cada projeto, para cobrar conforme o combinado.
11. Como usuário pessoal, quero alterar valores futuros sem mudar registros antigos, para preservar o histórico financeiro.
12. Como usuário pessoal, quero arquivar clientes e seus projetos e tarefas ativos, para retirar trabalho encerrado das listas ativas.
13. Como usuário pessoal, quero arquivar um projeto e suas tarefas ativas, para organizar trabalhos encerrados.
14. Como usuário pessoal, quero restaurar apenas os descendentes arquivados junto com um cliente ou projeto, para não reativar itens arquivados anteriormente.
15. Como usuário pessoal, quero consultar o histórico preservado dos itens arquivados, para manter rastreabilidade.
16. Como usuário pessoal, quero abrir o Echo no quadro global, para encontrar minhas tarefas ao entrar.
17. Como usuário pessoal, quero criar, renomear e ordenar colunas, para adaptar o quadro ao meu trabalho.
18. Como usuário pessoal, quero mover as tarefas antes de remover uma coluna ocupada, para não perder sua organização.
19. Como usuário pessoal, quero criar tarefas com título, descrição opcional e projeto opcional, para organizar atividades com ou sem projeto.
20. Como usuário pessoal, quero mover e ordenar tarefas, para definir meu fluxo de trabalho.
21. Como usuário pessoal, quero movimentar tarefas sem interferir no cronômetro, para separar organização e contagem.
22. Como usuário pessoal, quero ver o total de horas de cada tarefa no card, para acompanhar o esforço acumulado.
23. Como usuário pessoal, quero alternar o quadro entre tarefas ativas e arquivadas por um menu suspenso, para consultar ambas.
24. Como usuário pessoal, quero consultar uma coluna por vez no celular, para usar o quadro em uma tela estreita.
25. Como usuário pessoal, quero ver o cronômetro global em todas as telas, para controlar o trabalho sem voltar ao quadro.
26. Como usuário pessoal, quero iniciar uma tarefa com seus dados preenchidos, para registrar tempo com poucos passos.
27. Como usuário pessoal, quero iniciar livremente sem tarefa, projeto ou cliente, para começar a contar antes de organizar o registro.
28. Como usuário pessoal, quero que iniciar outra tarefa encerre e salve o período anterior, para manter um único cronômetro.
29. Como usuário pessoal, quero parar o cronômetro e salvar o período, para registrar o tempo efetivamente trabalhado.
30. Como usuário pessoal, quero retomar o último trabalho em um novo período, para não contar o intervalo parado.
31. Como usuário pessoal, quero identificar a última atividade e seu projeto no controle de retomada, para saber o que vou iniciar.
32. Como usuário pessoal, quero fechar a página ou trocar de dispositivo sem encerrar a contagem, para não perder tempo registrado.
33. Como usuário pessoal, quero que uma queda de conexão não interrompa uma contagem já iniciada, para preservar o tempo em andamento.
34. Como usuário pessoal, quero receber um conflito quando outra operação simultânea já foi confirmada, para atualizar meu estado sem duplicar ações.
35. Como usuário pessoal, quero confirmar o encerramento do período ao arquivar a tarefa ativa, para não deixar uma contagem associada a trabalho arquivado.
36. Como usuário pessoal, quero que uma falha ao salvar impeça o arquivamento e mantenha a contagem, para não perder o período.
37. Como usuário pessoal, quero consultar o histórico e filtrar por período, cliente e projetos, para localizar os registros relevantes.
38. Como usuário pessoal, quero lançar períodos manualmente, para registrar trabalho que não passou pelo cronômetro.
39. Como usuário pessoal, quero editar um registro na própria linha com salvar e cancelar, para corrigir dados sem sair do histórico.
40. Como usuário pessoal, quero editar a descrição do registro sem alterar a tarefa, para descrever o trabalho daquele período.
41. Como usuário pessoal, quero associar um registro livre a um projeto depois, para organizá-lo antes de faturar.
42. Como usuário pessoal, quero receber indicação de períodos sobrepostos, para corrigir conflitos antes de salvar.
43. Como usuário pessoal, quero registrar durações com precisão de segundos, para cobrar o tempo efetivo sem arredondamento em blocos.
44. Como usuário pessoal, quero exportar timesheet em CSV e PDF com início, fim, cliente, projeto e horas trabalhadas, para compartilhar os períodos selecionados.
45. Como usuário pessoal, quero escolher se incluo as tarefas no timesheet, para ajustar o detalhamento do documento.
46. Como usuário pessoal, quero que horas sem projeto apareçam no timesheet, para não omitir trabalho ainda não classificado.
47. Como usuário pessoal, quero preparar uma fatura para qualquer intervalo de datas, para cobrar períodos de durações diferentes.
48. Como usuário pessoal, quero ver quais registros foram excluídos da prévia e por quê, para corrigir a seleção antes de emitir.
49. Como usuário pessoal, quero ajustar o período para incluir um registro inteiro que cruza seu limite, para faturá-lo sem divisão automática ou parcial.
50. Como usuário pessoal, quero visualizar uma prévia sem reservar número ou bloquear horas, para conferir os dados livremente.
51. Como usuário pessoal, quero emitir uma fatura de um cliente reunindo seus projetos, para consolidar a cobrança.
52. Como usuário pessoal, quero escolher BRL ou USD e informar uma cotação quando necessária, para cobrar em uma única moeda.
53. Como usuário pessoal, quero que a fatura mostre horas e subtotal por projeto e permita editar a descrição do serviço, para apresentar a cobrança adequadamente.
54. Como usuário pessoal, quero que registros com valores de hora distintos sejam calculados individualmente, para preservar seus valores corretos.
55. Como usuário pessoal, quero emitir e baixar a fatura em português ou inglês, para atender clientes nos dois idiomas.
56. Como usuário pessoal, quero configurar a sequência por cliente e seu número inicial, para continuar cobranças iniciadas fora do Echo.
57. Como usuário pessoal, quero que baixar novamente preserve o número da fatura, para recuperar o documento sem criar outra cobrança.
58. Como usuário pessoal, quero que a emissão preserve dados e valores e bloqueie seus registros, para manter a cobrança consistente.
59. Como usuário pessoal, quero que horas já faturadas sejam identificadas e excluídas de outra fatura válida, para evitar cobrança duplicada.
60. Como usuário pessoal, quero marcar uma fatura como integralmente paga e informar a data, para acompanhar o recebimento.
61. Como usuário pessoal, quero desfazer uma marcação de pagamento, para corrigir um engano.
62. Como usuário pessoal, quero cancelar uma fatura após confirmação, para liberar as horas sem apagar o documento ou reutilizar seu número.
63. Como usuário pessoal, quero desfazer o pagamento antes de cancelar uma fatura paga, para manter o estado coerente.
64. Como usuário pessoal, quero cadastrar minha empresa e vários conjuntos de dados de pagamento, para escolher as informações apresentadas na fatura.

## Implementation Decisions

### Estado atual e organização

O repositório contém documentação de domínio e um protótipo descartável aprovado. Ainda não há aplicação de produção ou suíte de testes. O protótipo orienta organização e interação, mas seus cálculos, persistência simulada e validações parciais não são contratos de implementação.

Organizar responsabilidades em acesso e sessão; cadastros e preferências; quadro e tarefas; cronômetro e registros; consultas e timesheet; ciclo de faturas e geração de documentos. Essa divisão descreve responsabilidades e não determina arquivos, pacotes ou endpoints.

### Stack, persistência e acesso

- Usar TanStack Start, Query, Table e Form, com shadcn/ui.
- Usar Drizzle com o driver nativo bun:sqlite. Desenvolvimento e produção usam SQLite em arquivo local; no Dokploy, o arquivo fica em um volume persistente e o caminho é configurado por ambiente.
- Usar Better Auth na mesma base com adaptador Drizzle/SQLite, credencial pessoal única, sem cadastro público ou gestão de usuários. Sessão com cookie seguro e expiração deslizante de 30 dias, renovada durante o uso.
- Servir a aplicação com Bun como runtime, com versão fixa e bun.lock versionado. Dokploy executa o build no servidor usando Railpack, sem Dockerfile mantido no projeto. Definir comando de inicialização explícito e validar o build pelo Railpack e a execução da imagem resultante com Bun, incluindo acesso, sessão e banco real; não presumir o fallback do Railpack.
- Autorizar as operações protegidas no servidor. Query, Table e Form organizam a experiência no cliente, mas o servidor preserva as regras de negócio.

### Modelo de dados e contratos de comportamento

- Cliente tem projetos; Projeto tem exatamente um Cliente. Tarefa tem coluna e Projeto opcional. Registro de horas tem período, descrição própria e associações disponíveis, sem depender da descrição atual da Tarefa.
- Persistir o início da contagem e o estado necessário para um único Cronômetro global entre dispositivos. Fechar a página não o encerra. Parar produz um período encerrado; retomar cria outro sem incorporar a pausa.
- Preservar o valor de hora e a moeda usados por cada registro. Novos registros sem Projeto copiam o padrão geral; registros de Projeto usam o valor e moeda dele. Alterações nos padrões e projetos não recalculam registros antigos.
- Representar durações em segundos e valores de forma que os cálculos e arredondamentos monetários sejam determinísticos. Não arredondar duração em blocos.
- Impedir sobreposição ao criar ou editar registros, inclusive manualmente. Indicar o conflito ao usuário.
- Tratar troca de tarefa, parada com arquivamento e emissão de fatura como operações consistentes: falha não deve deixar metade da alteração confirmada.
- Em operações simultâneas conflitantes, a primeira confirmada vence. A outra informa conflito e solicita estado atualizado. A implementação deve proteger as invariantes no armazenamento, não apenas na interface.
- Arquivamento preserva histórico. Registrar informação suficiente para restaurar somente descendentes arquivados pela mesma ação em cascata, sem reativar os previamente arquivados.
- Preservar na Fatura um snapshot dos dados e valores emitidos, incluindo dados relevantes do cliente, empresa e pagamento, linhas, moeda, cotação e número. Mudanças posteriores nos cadastros não alteram a fatura.
- Manter associações entre Fatura e registros incluídos para bloquear edição e impedir nova cobrança enquanto a fatura for válida. Cancelamento libera os registros e preserva documento e número.

### Quadro, cronômetro e Horas

- Quadro inicial com navegação no topo. Celular mostra uma coluna por vez. Colunas admitem criação, renomeação e ordenação; tarefas admitem movimentação e ordenação. Remover coluna ocupada exige mover suas tarefas antes.
- Tarefa tem título, descrição opcional e Projeto opcional. Cards mostram o total de horas. O menu de ativas/arquivadas fica junto ao gerenciamento de colunas. Movimentação não altera o cronômetro.
- Iniciar uma Tarefa preenche seus dados disponíveis; iniciar outra salva o período atual e começa o seguinte. Início livre sem associações é permitido.
- Retomar último mostra atividade e Projeto, ou Sem projeto. A descrição do período é independente da descrição da Tarefa.
- Arquivar uma Tarefa em andamento exige confirmação para salvar o período e parar. Se salvar falhar, manter a contagem e não arquivar. Cascatas de arquivamento devem preservar essa proteção quando atingirem a tarefa em andamento.
- Horas reúne histórico, filtros, registro manual e entrada para timesheet e prévia de fatura. Editar um registro expande um accordion na própria linha, com salvar e cancelar. Registros de fatura válida ficam bloqueados.
- Internet é necessária para iniciar, parar ou editar. Durante perda de conexão, a contagem já iniciada continua a partir do início persistido. Não enfileirar alterações offline.

### Cadastros e exportação de timesheet

- Cliente exige nome de exibição. Nome legal do destinatário, identificação fiscal e endereço são opcionais.
- Projeto exige nome, Cliente, valor de hora não negativo com centavos e moeda BRL ou USD.
- Empresa exige nome ou razão social. Identificação fiscal, endereço e telefone são opcionais.
- Cada conjunto de Dados de pagamento exige rótulo e instruções de recebimento; a pessoa escolhe um conjunto ao emitir.
- Preferências incluem valor de hora padrão, moeda correspondente e fuso configurável com America/Recife como padrão.
- Timesheet detalha cada período selecionado, inclusive sem Projeto. Filtros por período, Cliente e Projetos. CSV e PDF incluem início, fim, Cliente, Projeto e horas trabalhadas; Tarefa é uma opção do usuário. Não incluir descrição ou valores monetários.

### Faturamento

- Período livre por datas inicial e final, interpretado no fuso configurado. Só incluir registros encerrados, com Projeto e inteiramente no período. Excluir por inteiro os que cruzam limites; não oferecer divisão nem faturamento parcial.
- A prévia identifica exclusões: em andamento, sem Projeto, fora dos limites completos ou já em outra fatura válida. Não para o cronômetro, reserva número ou bloqueia registros.
- Uma Fatura pertence a um Cliente e uma moeda escolhida, BRL ou USD, podendo reunir Projetos com moedas de origem diferentes.
- Calcular cada registro pela duração efetiva e valor preservado; somar por Projeto. Exibir horas e subtotal por Projeto, sem valor de hora único para valores diferentes. Descrição de serviço editável por linha de Projeto.
- Cotação positiva única por fatura no formato 1 USD = X BRL. USD para BRL multiplica; BRL para USD divide. Preservar cotação e resultados na emissão.
- Calcular registros com precisão completa, somar por Projeto, converter o subtotal e arredondar cada linha para centavos. Total é a soma das linhas exibidas; meio centavo arredonda para cima.
- Emitir salva snapshot, consome número e bloqueia registros como uma operação consistente. Sequência por Cliente, com início configurável. Após emitir, próximo número deve ser maior que todos emitidos para o Cliente, inclusive cancelados. Baixar novamente não consome número.
- Gerar PDF em português ou inglês sob demanda a partir do snapshot, sem armazenar arquivo PDF no banco.
- Marcação de pagamento integral inclui data e pode ser desfeita. Cancelar uma fatura paga exige desfazer a marcação. Cancelamento requer confirmação, preserva documento e número, não reutiliza número e libera registros.

## Testing Decisions

Estratégia confirmada pelo usuário: testes das operações públicas com SQLite real e testes dos fluxos no navegador.

- Concentrar a verificação das regras na fronteira pública de comandos e consultas da aplicação no servidor, usando banco SQLite real e isolado. Observar respostas e estado consultável após a ação, sem testar métodos privados, detalhes de componentes ou estrutura das tabelas.
- Controlar tempo e dados de entrada para testar duração em segundos, pausa e retomada, mudança de fuso, limites de períodos e precisão monetária sem esperas reais ou resultados instáveis.
- Cobrir por essa fronteira cadastros e cascatas; padrões e valores preservados; cronômetro e registros; sobreposição; seleção e emissão de faturas; numeração; bloqueio, pagamento e cancelamento.
- Exercitar concorrência com operações simultâneas e armazenamento real: troca/parada do timer, emissão concorrente e disputa pelos mesmos registros. Verificar que só o primeiro resultado válido é confirmado e que falhas não deixam operações parciais.
- Complementar com poucos testes no navegador percorrendo a aplicação completa: acesso protegido e sessão, quadro desktop e celular, cronômetro entre duas sessões, edição pelo accordion, mensagens de conflito e conexão perdida, prévia e ciclo de fatura, exportação CSV/PDF e seleção opcional de Tarefa.
- Verificar conteúdo e valores dos documentos por seus resultados públicos. Para CSV, conferir campos e linhas. Para PDF, conferir conteúdo legível e realizar revisão visual de exemplos em português e inglês. Evitar testes que dependam dos bytes exatos do PDF ou copiem o HTML do protótipo.
- Usar exemplos com moedas e valores distintos, meios centavos, registros sem Projeto, registros nas bordas de períodos e faturas canceladas. Verificar que mudanças em cadastros e valores não alteram documentos já emitidos.
- A suíte existente não oferece precedentes porque ainda não há aplicação ou testes no repositório. O protótipo aprovado é referência de interação, não uma suíte ou implementação reutilizável. A infraestrutura de testes usa SQLite nativo do Bun em arquivos isolados, sem usar dados de produção.

## Out of Scope

- Múltiplos usuários, equipes, gestão de permissões e portal de clientes; cadastro público.
- Ações offline e fila de alterações feitas sem conexão.
- Prioridades, prazos e checklists de tarefas.
- Pagamentos parciais.
- Divisão de registros e faturamento parcial de um período.
- Valores monetários e descrição na exportação de timesheet.
- Definição da política de backup e restauração, explicitamente adiada pelo usuário.
- Executar implementação ou publicar a aplicação durante a produção desta spec.

## Further Notes

- Fonte de decisões: [Especificar o app pessoal de horas e freelas](https://github.com/caiofsr/echo/issues/1). A [validação consolidada](https://github.com/caiofsr/echo/issues/5#issuecomment-6273507774) registra o entendimento final.
- A decisão posterior de não oferecer divisão de registros substitui a orientação anterior de dividir períodos nas bordas da seleção. Prevalecem a exclusão integral e o ajuste do intervalo da fatura.
- Referência visual: [protótipo aprovado](https://github.com/caiofsr/echo/tree/703ce8aecb254b1db26cc2fcbe70f32b7bb181eb/docs/prototypes). Seus dados são fictícios. A imagem inicial de fatura orienta campos e apresentação; não fornece números, valores ou dados pessoais padrão.
- Leitura das decisões: [faturamento](https://github.com/caiofsr/echo/issues/2), [fluxos](https://github.com/caiofsr/echo/issues/3), [arquitetura](https://github.com/caiofsr/echo/issues/4) e [arquivamento e cadastros](https://github.com/caiofsr/echo/issues/6).
- A decisão de arquitetura registra a consulta a fontes oficiais. Ao implementar o scaffold, conferir o artefato produzido para execução com Bun, comando de inicialização e limites operacionais do servidor Dokploy. Esses detalhes não estão presumidos nesta spec.
- Ordem sugerida: scaffold e runtime; persistência e acesso; cronômetro; cadastros, quadro e tarefas; registros e timesheet; ciclo de faturas e PDF; validação em computador e celular. A divisão em entregas verticais e dependências será feita em /to-tickets.
- Esta spec de implementação é separada do mapa Wayfinder encerrado. Seus tickets serão publicados como subissues com dependências nativas e rótulo ready-for-agent após aprovação da divisão.

### Refinamento aprovado da issue #8

Confirmado em 22/10/2026.

- A tela de entrada pede somente a senha. Qualquer identificador interno exigido pela autenticação fica fora desse fluxo.
- A primeira senha é definida por uma operação administrativa no servidor. A mesma operação permite redefini-la em caso de esquecimento, sem recuperação por e-mail nesta versão.
- A redefinição da senha encerra todas as sessões existentes.
- Computador e celular podem permanecer conectados simultaneamente. Sair encerra somente a sessão daquele navegador.
- Sair preserva o cronômetro em andamento, que continua independente do dispositivo.
- A sessão expira após 30 dias de inatividade e é renovada pelo uso autenticado, sem prazo máximo adicional nesta versão.
- Ao acessar um destino protegido, entrar retorna ao destino interno solicitado. Sem destino específico, entrar abre o Quadro.
- Se a sessão expirar durante uma edição, o formulário é preservado temporariamente naquela aba para restauração após novo acesso. O Echo atualiza os dados do servidor e exige confirmação antes de salvar, sem envio automático. O cronômetro continua contando.
- Tentativas repetidas de senha recebem limitação por origem e espera temporária, com mensagem em português indicando quando tentar novamente. Não há bloqueio permanente da credencial.
- A issue #8 entrega acesso, sessão e estrutura responsiva com Quadro, Horas, Faturas, Cadastros e Configurações. Funcionalidades das próximas issues exibem uma mensagem de indisponibilidade temporária. Dados fictícios ficam restritos ao protótipo.
- Sair limpa os formulários temporários e oculta os dados protegidos em todas as abas daquele navegador, preservando as sessões dos outros dispositivos. Havendo alterações não salvas, o Echo pede confirmação antes de sair e descartá-las. A preservação temporária de formulários aplica-se à expiração involuntária da sessão.
- A definição e a redefinição administrativa exigem senha de pelo menos 15 caracteres, permitem frases e não exigem combinações de maiúsculas, números ou símbolos. A entrada aceita colagem e preenchimento por gerenciadores de senha.
- Bun é o runtime escolhido para o Echo, substituindo a decisão anterior de executar em Node.js. Fixar a versão, versionar bun.lock e definir o comando de inicialização explicitamente.
- A validação da issue #8 inclui build pelo Railpack e execução da imagem resultante com Bun, cobrindo entrada, sessão e banco real. A validação no Dokploy é uma etapa separada, sem publicação em produção nesta issue. O suporte documentado do Railpack ao Bun não substitui esse teste: https://railpack.com/languages/bun.
- SQLite local com o driver nativo bun:sqlite e Drizzle é usado tanto em desenvolvimento quanto em produção no Dokploy. O suporte ao Turso/libSQL foi removido por decisão do usuário; configurar o caminho do banco por ambiente e um volume persistente no servidor.
- A renovação da sessão considera o uso em uma aba visível. Uma aba inativa em segundo plano não renova a sessão indefinidamente. A expiração não interrompe o cronômetro.
- O rascunho preservado após expiração fica somente na memória da aba aberta. Recarregar ou fechar a página descarta esse rascunho, sem armazenamento local persistente dos dados do formulário.
