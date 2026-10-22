# Decisões confirmadas

Registro das decisões confirmadas antes da migração para GitHub Issues. A especificação final depende das decisões ainda abertas no [mapa de planejamento](https://github.com/caiofsr/echo/issues/1). As novas resoluções serão registradas nas respectivas issues do mapa.

## Destino e acesso

- Produzir uma especificação pronta para começar o desenvolvimento.
- Webapp para computador e celular, de uso pessoal, sem gestão de outras contas ou IAM.
- Acesso protegido por uma senha pessoal única, sem cadastro de usuários ou gestão de permissões.
- Os mesmos dados devem estar disponíveis no computador e no celular.
- Stack da família TanStack, incluindo Start, Query, Table e Form. Uso de outros componentes será definido conforme a necessidade.
- Deploy no servidor Dokploy do usuário, com Railpack e sem Dockerfile mantido no projeto. Compatibilidade ainda não verificada.

## Projetos, tarefas e horas

- Um cliente tem vários projetos; cada projeto pertence a um cliente.
- Tarefas podem ter um projeto ou ficar sem projeto.
- Há um único cronômetro global. O play de uma tarefa preenche tarefa, descrição, projeto e cliente, quando existirem.
- Iniciar outra tarefa para e salva o período atual e inicia outro.
- É possível iniciar livremente, sem tarefa, projeto ou cliente.
- A descrição do período pode ser editada sem alterar a tarefa.
- Fechar a página ou trocar de dispositivo não encerra a contagem.
- É possível adicionar e editar períodos manualmente e vincular depois um período livre a um projeto.

## Kanban e histórico

- Um quadro global com criação, renomeação e ordenação das colunas e movimentação e ordenação das tarefas.
- Antes de remover uma coluna com tarefas, elas devem ser movidas para outra coluna.
- Movimentar tarefas é independente do cronômetro.
- Arquivamento de tarefas, projetos e clientes preserva o histórico.

## Valores e exportações

- Valor de hora padrão geral, com valor específico por projeto.
- Registros antigos preservam o valor da hora; mudanças passam a valer para novos registros.
- Moeda de origem e escolha de BRL ou USD na exportação, com cotação informada na exportação quando necessária.
- Timesheet em CSV e PDF, com filtros por período, cliente e projetos.
- Fatura opcional em PDF, em português ou inglês, por um único cliente e uma única moeda.
- Cadastro da própria empresa com CNPJ, nome ou razão social, endereço, telefone e informações de pagamento conforme referência enviada.
- Vários conjuntos de dados de pagamento, escolhidos ao gerar a fatura.
- Faturas salvas, com dados e valores preservados e numeração sequencial.
- Deve ser possível escolher o número inicial para continuar uma sequência de faturas já existente fora do app.
- A sequência de faturas é por cliente, com próximo número inicial configurável. Baixar novamente não consome outro número.
- Faturas emitidas bloqueiam a edição dos registros incluídos. É necessário cancelar a fatura antes de editar as horas.
- Faturas canceladas permanecem salvas para rastreabilidade e seus números não são reutilizados.
- Deve haver aviso ao tentar faturar novamente horas já incluídas em uma fatura válida.
- Timesheet detalha cada período; fatura agrupa por projeto, com descrição do serviço editável.

## Precisão e conectividade

- Duração registrada com precisão de segundos, sem arredondamento em blocos. O valor é calculado pelo tempo efetivo, com arredondamento monetário para centavos.
- Períodos sobrepostos são impedidos, inclusive em lançamentos manuais, com indicação do conflito para correção.
- A primeira versão exige internet para iniciar, parar e editar. A contagem continua durante uma queda de conexão a partir do início salvo.
- Registrar ações offline fica para uma versão posterior.

## Interface e fluxo diário

- Cronômetro visível em todas as telas, com parar e retomar. Parar salva o período; retomar cria outro com os mesmos dados e não conta o intervalo.
- Tarefas com título, descrição opcional e projeto opcional. Cards mostram o total de horas da tarefa.
- Prioridades, prazos e checklists ficam fora da primeira versão.
- Horas sem projeto aparecem no timesheet, mas precisam ser vinculadas a um projeto antes de entrar em uma fatura.
- Interface em português, idioma dos documentos escolhido na exportação e fuso horário configurável com padrão America/Recife.

## Referência visual

A imagem enviada é uma referência dos campos e apresentação da fatura. Os números, valores e dados pessoais nela não foram tratados como valores padrão do produto.

## Acesso e sessão, refinamento da issue #8

Decisões confirmadas em 22/10/2026 durante o grill-with-docs da issue #8.

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
- O teste com um banco remoto Turso fica adiado e não bloqueia a conclusão da issue #8. A configuração por ambiente continua no escopo; o acesso remoto não deve ser declarado validado sem teste.
- A renovação da sessão considera o uso em uma aba visível. Uma aba inativa em segundo plano não renova a sessão indefinidamente. A expiração não interrompe o cronômetro.
- O rascunho preservado após expiração fica somente na memória da aba aberta. Recarregar ou fechar a página descarta esse rascunho, sem armazenamento local persistente dos dados do formulário.
