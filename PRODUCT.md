# Echo

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Stack confirmada para implementação: TanStack Start, Query, Table e Form, com shadcn/ui. Bun é o runtime, com versão fixa e bun.lock versionado. Drizzle usa o cliente libSQL (`@libsql/client`), com SQLite em arquivo local em desenvolvimento e serviço libSQL do Dokploy em produção. Better Auth protege o acesso com uma credencial pessoal única.

O destino de deploy é o servidor Dokploy do usuário, com build pelo Railpack e sem Dockerfile mantido no projeto. A compatibilidade do build e da execução deve ser verificada; o destino escolhido não constitui evidência de implantação concluída.

## Users

O usuário principal é o próprio profissional freelancer, que organiza tarefas, registra trabalho e cobra clientes. Usa computador e celular, com os mesmos dados disponíveis entre dispositivos. A primeira versão é pessoal e de usuário único.

## Product Purpose

Reunir organização do trabalho, registro do tempo efetivo e faturamento sem reconstruir períodos e valores em ferramentas separadas. O usuário deve conseguir continuar o trabalho entre dispositivos e consultar o histórico que sustenta cada cobrança.

## Operating Context

- A interface é em português. O fuso é configurável, com America/Recife como padrão.
- O Quadro é a entrada padrão. A navegação inclui Quadro, Horas, Faturas, Cadastros e Configurações.
- Cliente tem projetos; cada projeto pertence a um cliente. Tarefas podem ter projeto ou ficar sem projeto.
- O cronômetro global fica disponível em todas as telas. Permite início livre, início por tarefa, parada e retomada do último trabalho em um novo período.
- Horas reúne consulta, filtros, lançamentos manuais, edição de registros, exportação de timesheet e entrada para a prévia de fatura.
- O quadro permite organizar colunas e tarefas. No celular, mostra uma coluna por vez. Mover tarefas não altera o cronômetro.

## Capabilities and Constraints

### Acesso e continuidade

- A entrada pede somente a senha pessoal, sem cadastro público, gestão de contas ou permissões. Definição e redefinição da senha ocorrem por operação administrativa no servidor.
- Computador e celular podem manter sessões simultâneas. Sair encerra a sessão daquele navegador; redefinir a senha encerra todas as sessões.
- O cronômetro continua ao fechar a página, sair, trocar de dispositivo, perder conexão ou expirar a sessão.
- Ações de iniciar, parar e editar exigem internet. Não há fila de ações offline na primeira versão.
- Após expiração involuntária da sessão, o formulário pode ser preservado somente na memória da aba. O novo acesso atualiza os dados e exige confirmação antes de salvar. Recarregar ou fechar a aba descarta o rascunho.

### Horas e histórico

- Há um único cronômetro global e nenhum registro pode sobrepor outro. Iniciar outra tarefa encerra e salva o período anterior antes de iniciar o seguinte.
- Durações têm precisão de segundos, sem arredondamento em blocos. Retomar cria outro período e não inclui a pausa.
- Cada registro tem descrição própria e preserva o valor de hora e a moeda usados. Alterar padrões ou projetos não recalcula registros antigos.
- Arquivar clientes, projetos e tarefas preserva o histórico. A restauração respeita quais descendentes foram arquivados pela mesma ação.
- Operações simultâneas conflitantes seguem a primeira confirmação válida. Falhas não devem deixar operações parcialmente concluídas.

### Timesheet e faturas

- Timesheet exporta CSV e PDF dos períodos selecionados, com filtros por período, cliente e projetos. Inclui registros sem projeto; tarefa é um campo opcional. Não inclui descrição ou valores monetários.
- Fatura pertence a um cliente e usa uma moeda, BRL ou USD. Pode reunir projetos e usa cotação informada quando necessária. O PDF pode ser em português ou inglês.
- A prévia explica exclusões e não consome número nem bloqueia horas. Só registros encerrados, vinculados a projeto e inteiramente contidos no período podem entrar na fatura.
- Não há divisão automática de registros nem faturamento parcial de um período.
- A emissão preserva dados e valores, atribui número sequencial por cliente e bloqueia os registros incluídos. Alterações posteriores nos cadastros não mudam a fatura.
- Cancelar preserva o documento e seu número e libera as horas. Números não são reutilizados. Baixar novamente não gera outra cobrança.
- Pagamento é integral e registrado manualmente com data. Para cancelar uma fatura paga, é necessário desfazer a marcação de pagamento.
- Várias empresas e formas de recebimento são cadastráveis. A pessoa escolhe a empresa e a forma de recebimento em cada fatura; as formas são compartilhadas entre empresas.

### Limites da primeira versão

Não inclui equipes, múltiplos usuários, portal de clientes, ações offline, prioridades, prazos, checklists ou pagamentos parciais. A política de backup e restauração permanece adiada. A validação no Dokploy não deve ser apresentada como concluída sem evidência.

## Brand Commitments

O nome do produto é Echo. A interface usa português e o vocabulário de `GLOSSARY.md`. Em particular, fatura não é sinônimo de recibo, e registro de horas tem significado próprio, independente da tarefa.

### Ícones autorais

Ao criar telas ou adicionar ícones, criar ícones próprios do Echo com a skill `soft-icons`, em SVG vetorial editável. Essa diretriz abrange ícones de interface e ilustrados; usar versões simplificadas nos tamanhos pequenos para manter a legibilidade. Manter projeção, iluminação, materiais e escala óptica consistentes na família. Cada ícone deve ter seu arquivo `.svg`, passar pelo validador da skill e ser renderizado e inspecionado nos tamanhos e fundos de uso antes da entrega. Componentes React podem encapsular a geometria validada.

## Evidence on Hand

- `docs/planning/decisoes-confirmadas.md` registra as decisões do produto e os refinamentos de acesso e sessão.
- `docs/planning/echo-v1-spec.md` detalha histórias, regras, arquitetura e validação. Este documento resume o contexto durável e não substitui os contratos da spec.
- `GLOSSARY.md` define a linguagem de domínio.
- O protótipo aprovado, variante B, está referenciado na spec no commit `703ce8aecb254b1db26cc2fcbe70f32b7bb181eb`, em `docs/prototypes`. Orienta organização e interação; contém dados fictícios e não é implementação de produção.
- A imagem de referência de fatura orienta campos e apresentação. Seus números, valores e dados pessoais não são padrões do produto.
- O planejamento e um scaffold inicial estão presentes no repositório. A presença desses arquivos não comprova entrega ou validação dos fluxos. Não apresentar funcionalidades planejadas como entregues.

## Product Principles

- Permitir começar a registrar o trabalho antes de classificá-lo, com posterior associação a projeto.
- Manter um único trabalho em andamento entre dispositivos, sem incluir pausas ou duplicar períodos.
- Preservar o histórico de horas e os dados financeiros que sustentam cada fatura.
- Tornar conflitos, exclusões e bloqueios compreensíveis antes da confirmação de uma ação.
- Manter o escopo pessoal e os fluxos utilizáveis no computador e no celular.

## Accessibility & Inclusion

A entrada aceita colagem e preenchimento por gerenciadores de senha. A definição administrativa aceita frases de pelo menos 15 caracteres, sem exigir combinações de maiúsculas, números ou símbolos. Mensagens de acesso e espera por tentativas repetidas são em português.
