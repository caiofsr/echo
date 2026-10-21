# Proposta de tickets para Echo v1

Especificação: https://github.com/caiofsr/echo/issues/7

Estado: divisão aprovada e tickets publicados com dependências nativas verificadas. Cada entrega inclui persistência, operações protegidas, interface e testes de comportamento aplicáveis. As referências numéricas abaixo são apenas a ordem desta proposta, não números de issues.

## 1. [Entrar no Echo com sessão persistida](https://github.com/caiofsr/echo/issues/8)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Abrir a aplicação responsiva protegida por senha pessoal e manter a sessão em visitas seguintes, com persistência real e execução Node compatível com Railpack.

**Blocked by:** None (can start immediately)

**Acceptance criteria**

- [ ] Aplicação TanStack Start com interface em português, shadcn/ui e navegação aprovada; usuário sem sessão não acessa dados ou operações protegidas.
- [ ] Better Auth com única credencial pessoal, sem cadastro público; cookie seguro e expiração deslizante de 30 dias.
- [ ] Drizzle/libSQL com SQLite local e configuração de Turso por ambiente; inicialização e migrações documentadas sem segredos versionados.
- [ ] Build e comando do artefato Node conferidos para execução pelo Railpack, sem Dockerfile; documentar requisitos e limites a verificar no servidor sem publicar em produção.
- [ ] Testes da operação pública de acesso com SQLite real e fluxo no navegador; infraestrutura reutilizável para banco isolado e controle de tempo.

## 2. [Gerenciar clientes e projetos](https://github.com/caiofsr/echo/issues/9)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Cadastrar e editar clientes e seus projetos pela interface, mantendo os vínculos e os valores de hora disponíveis após recarregar.

**Blocked by:** 1. Entrar no Echo com sessão persistida

**Acceptance criteria**

- [ ] Cliente exige nome de exibição; dados legais do destinatário, identificação fiscal e endereço são opcionais.
- [ ] Projeto exige nome, Cliente, valor não negativo com centavos e moeda BRL ou USD; vínculo com exatamente um Cliente.
- [ ] Listas e formulários persistem e exibem validações no servidor e na interface, usando TanStack Query/Table/Form conforme aplicável.
- [ ] Alterações são consultáveis entre sessões autenticadas e não dependem de dados do protótipo.
- [ ] Cobrir criação, edição, validações e vínculos por operações públicas com SQLite real e um fluxo de cadastro no navegador. Arquivamento fica em entrega própria.

## 3. [Registrar trabalho livre no cronômetro global](https://github.com/caiofsr/echo/issues/10)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Configurar valor e moeda padrão e fuso, iniciar uma contagem sem associações, parar, consultar o período salvo e retomar sem contar a pausa.

**Blocked by:** 1. Entrar no Echo com sessão persistida

**Acceptance criteria**

- [ ] Preferências persistem valor e moeda padrão e fuso, com America/Recife como padrão; novos períodos livres copiam valor e moeda sem recalcular os anteriores.
- [ ] Cronômetro aparece em todas as telas; início, parada e retomada persistem períodos com precisão de segundos e histórico consultável em Horas.
- [ ] Fechar a página ou usar outro dispositivo preserva o início e a contagem; somente um cronômetro pode estar ativo.
- [ ] Conexão é necessária para iniciar/parar/editar; queda durante contagem não a encerra e não enfileira ações offline. Conflitos simultâneos informam o resultado e atualizam o estado.
- [ ] Testar operações com SQLite real, relógio controlado e disputas de início/parada; demonstrar contagem e retomada em duas sessões no navegador.

## 4. [Organizar tarefas no quadro responsivo](https://github.com/caiofsr/echo/issues/11)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Criar tarefas com Projeto opcional e organizá-las em colunas e posições persistidas, usando o quadro no computador e celular.

**Blocked by:** 2. Gerenciar clientes e projetos

**Acceptance criteria**

- [ ] Quadro é a tela inicial, com navegação no topo; no celular aparece uma coluna por vez.
- [ ] Criar e editar Tarefas com título, descrição opcional e Projeto opcional; criar, renomear e ordenar Colunas e mover/ordenar Tarefas.
- [ ] Gerenciamento de Colunas em lista compacta com arraste, nome editável e remoção; Coluna ocupada exige movimentação prévia das Tarefas.
- [ ] Operações persistem e são protegidas no servidor; controles são utilizáveis por teclado e em tela estreita.
- [ ] Testes de comportamento com banco real e fluxo no navegador em computador e celular; integração com timer e arquivamento ficam em entregas próprias.

## 5. [Cronometrar tarefas e acompanhar suas horas](https://github.com/caiofsr/echo/issues/12)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Iniciar trabalho a partir de uma Tarefa, trocar de atividade sem perder períodos e acompanhar as horas acumuladas nos cards.

**Blocked by:** 3. Registrar trabalho livre no cronômetro global, 4. Organizar tarefas no quadro responsivo

**Acceptance criteria**

- [ ] Iniciar uma Tarefa preenche Tarefa, descrição, Projeto e Cliente quando disponíveis e preserva o valor/moeda aplicáveis no novo Registro.
- [ ] Iniciar outra Tarefa salva e encerra o período atual e começa o seguinte como uma operação consistente, sem sobreposição ou duas contagens ativas.
- [ ] Descrição do Registro permanece independente da Tarefa; mover ou ordenar a Tarefa não interfere no cronômetro.
- [ ] Cards mostram horas acumuladas; Retomar último exibe tooltip com atividade e Projeto, ou Sem projeto, e cria novo período sem contar a pausa.
- [ ] Testar troca simultânea, falha no salvamento e preservação de valores por operações públicas com banco real; validar o fluxo de play/troca/retomada no navegador.

## 6. [Lançar, corrigir e filtrar registros de horas](https://github.com/caiofsr/echo/issues/13)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Consultar o histórico, lançar períodos manuais, editar dados na própria linha e associar trabalho livre a um Projeto.

**Blocked by:** 3. Registrar trabalho livre no cronômetro global, 4. Organizar tarefas no quadro responsivo

**Acceptance criteria**

- [ ] Horas filtra por período, Cliente e Projetos e preserva registros sem Projeto no histórico.
- [ ] Criar períodos manuais com associações opcionais; editar início/fim, descrição e associações aplicáveis e vincular registro livre a Projeto.
- [ ] Edição por accordion na própria linha, com salvar/cancelar; alterar descrição do Registro não altera a Tarefa.
- [ ] Servidor impede sobreposições, inclusive com contagem em andamento e alterações simultâneas, e identifica o conflito; duração mantém segundos e valores históricos preservados.
- [ ] Cobrir criação, edição, filtros, preservação de dados e conflitos com banco real e relógio controlado; validar accordion e mensagens no navegador. Bloqueio por fatura será integrado na emissão.

## 7. [Arquivar e restaurar trabalho preservando o histórico](https://github.com/caiofsr/echo/issues/14)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Arquivar Tarefas, Projetos e Clientes, restaurar somente os descendentes da mesma ação e encerrar com segurança o trabalho ativo atingido pelo arquivamento.

**Blocked by:** 5. Cronometrar tarefas e acompanhar suas horas

**Acceptance criteria**

- [ ] Arquivar Cliente arquiva seus Projetos ativos e as Tarefas ativas deles; arquivar Projeto arquiva suas Tarefas ativas; histórico de registros permanece.
- [ ] Restaurar Cliente/Projeto restaura apenas descendentes arquivados junto nessa ação, preservando os previamente arquivados.
- [ ] Arquivar Tarefa em contagem ativa, diretamente ou por cascata, exige confirmação para salvar o período e parar; falha mantém contagem e impede arquivamento parcial.
- [ ] Quadro tem menu de Tarefas ativas/arquivadas junto ao controle de Colunas; Cadastros permite consultar e restaurar itens arquivados.
- [ ] Testar cascatas, restauração seletiva, falhas e concorrência com banco real; validar confirmação e filtros no navegador.

## 8. [Exportar timesheet em CSV e PDF](https://github.com/caiofsr/echo/issues/15)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Exportar os períodos filtrados de Horas como timesheet, escolhendo se o documento inclui a Tarefa.

**Blocked by:** 6. Lançar, corrigir e filtrar registros de horas

**Acceptance criteria**

- [ ] Filtros por período, Cliente e Projetos determinam os registros exportados; registros sem Projeto podem aparecer.
- [ ] CSV e PDF detalham cada período com início, fim, Cliente, Projeto e horas trabalhadas; inclusão de Tarefa é opção do usuário.
- [ ] Não exportar descrição ou valores monetários; duração e datas respeitam os dados registrados e o fuso configurado.
- [ ] Documento é gerado a partir da mesma seleção exibida ao usuário, sem alterar registros.
- [ ] Conferir campos e linhas do CSV, conteúdo legível do PDF e revisão visual do PDF; validar escolha de Tarefa e download no navegador.

## 9. [Configurar empresa e dados de pagamento](https://github.com/caiofsr/echo/issues/16)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Salvar os dados da própria empresa e vários conjuntos identificados de instruções de recebimento, disponíveis para futuras faturas.

**Blocked by:** 1. Entrar no Echo com sessão persistida

**Acceptance criteria**

- [ ] Configurações permite editar Empresa com nome ou razão social obrigatório; identificação fiscal, endereço e telefone opcionais.
- [ ] Criar e editar vários conjuntos de Dados de pagamento com rótulo e instruções obrigatórios.
- [ ] Dados persistem entre sessões, com operações protegidas e validações no servidor e interface.
- [ ] Não incorporar dados pessoais ou valores fictícios do protótipo como padrões reais.
- [ ] Cobrir persistência e validações com SQLite real e um fluxo de configuração no navegador. Seleção e snapshot são integrados nas entregas de faturamento.

## 10. [Preparar e conferir a prévia de fatura](https://github.com/caiofsr/echo/issues/17)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Selecionar um Cliente e período livre, conferir inclusões e exclusões e visualizar a cobrança agrupada por Projeto antes de emitir.

**Blocked by:** 6. Lançar, corrigir e filtrar registros de horas, 9. Configurar empresa e dados de pagamento

**Acceptance criteria**

- [ ] Período livre por datas no fuso configurado; incluir somente registros encerrados, com Projeto do Cliente e inteiramente no intervalo.
- [ ] Mostrar exclusões e motivos para contagem em andamento, sem Projeto, fora dos limites completos ou já faturado quando esse vínculo existir. Não dividir ou faturar parcialmente períodos.
- [ ] Prévia não para timer, reserva número ou bloqueia horas; escolha de BRL/USD, idioma, dados de pagamento e descrição do serviço por Projeto.
- [ ] Calcular cada registro pela duração e valor preservado, somar por Projeto, converter subtotal por cotação positiva única 1 USD = X BRL e arredondar cada linha para centavos com meio para cima; total soma linhas.
- [ ] Mostrar horas/subtotal por Projeto sem taxa única quando houver valores diferentes; testar moedas distintas, bordas do período, fuso e arredondamento com banco real e validar prévia no navegador.

## 11. [Emitir faturas com numeração e dados preservados](https://github.com/caiofsr/echo/issues/18)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Confirmar a emissão, consultar a fatura emitida e manter seus dados e valores preservados, bloqueando os registros incluídos.

**Blocked by:** 10. Preparar e conferir a prévia de fatura

**Acceptance criteria**

- [ ] Emissão salva snapshot, atribui número da sequência do Cliente e bloqueia registros em uma operação consistente, revalidando a seleção no servidor.
- [ ] Número inicial configurável por Cliente; após emissão, próximo número deve superar todos os já emitidos, inclusive cancelados. Consulta não consome novo número.
- [ ] Lista e detalhe de Faturas mostram a cobrança emitida a partir do snapshot de Cliente, Empresa, pagamento, linhas, moeda e cotação, sem depender de cadastros atuais.
- [ ] Registros de fatura válida ficam bloqueados na edição de Horas e excluídos com motivo em novas prévias; tentativa de alterar ou faturar novamente é rejeitada no servidor.
- [ ] Testar emissões simultâneas, numeração, disputa por registros, rollback e preservação do snapshot após mudanças de cadastro com banco real; validar emissão e bloqueio no navegador.

## 12. [Baixar faturas em PDF em português e inglês](https://github.com/caiofsr/echo/issues/19)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Gerar e baixar novamente o PDF de uma fatura emitida, preservando número, dados e valores do documento original.

**Blocked by:** 11. Emitir faturas com numeração e dados preservados

**Acceptance criteria**

- [ ] Gerar PDF sob demanda a partir do snapshot emitido, sem armazenar arquivo PDF no banco.
- [ ] Documentos em português ou inglês conforme escolha registrada para a fatura; apresentar Cliente, Empresa, pagamento, linhas por Projeto, horas, subtotais e total preservados.
- [ ] Baixar novamente não emite outra fatura, consome número ou altera bloqueios de registros.
- [ ] Layout usa a referência aprovada de fatura sem transformar dados pessoais e valores da imagem em valores padrão.
- [ ] Verificar conteúdo e valores nos dois idiomas e revisar visualmente PDFs representativos; validar acesso protegido e download no navegador sem comparar bytes exatos.

## 13. [Registrar pagamento e cancelar faturas](https://github.com/caiofsr/echo/issues/20)

**Parent:** [Implementar a primeira versão do Echo](https://github.com/caiofsr/echo/issues/7)

**What to build:** Marcar pagamento integral, desfazê-lo e cancelar uma fatura preservando seu documento e liberando as horas para edição ou nova cobrança.

**Blocked by:** 11. Emitir faturas com numeração e dados preservados

**Acceptance criteria**

- [ ] Marcar pagamento integral com data e permitir desfazer a marcação; não implementar pagamentos parciais.
- [ ] Antes de cancelar uma fatura paga, exigir desfazer pagamento; cancelamento exige confirmação explícita.
- [ ] Cancelamento preserva snapshot, documento e número, libera registros e nunca reutiliza a numeração.
- [ ] Horas liberadas podem ser editadas e voltam a ser elegíveis para nova prévia; lista e detalhe exibem estados coerentes.
- [ ] Testar transições e disputas com emissão/edição usando banco real; validar ciclo de pagamento, desfazer e cancelar no navegador, incluindo preservação do documento original.
