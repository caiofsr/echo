# Protótipo de fluxos do Echo

Protótipo descartável para a decisão [Validar os fluxos do cronômetro, kanban e exportação](https://github.com/caiofsr/echo/issues/3). Abra `echo-prototype.html` diretamente no navegador. `echo-mobile-preview.html` apresenta a mesma página em 390 px.

As variantes A, B e C são escolhidas pela barra inferior ou por `?variant=A`, `?variant=B` e `?variant=C`. Os dados vivem apenas em memória e são fictícios. Recarregar reinicia o exemplo.

## Organização aprovada antes do protótipo

- Quadro como tela inicial, cronômetro global em todas as telas e uma coluna por vez no celular.
- Navegação por Quadro, Horas, Faturas e Cadastros. Preferências, empresa e dados de pagamento em Configurações.
- Horas concentra histórico, filtros, registros manuais e entrada para timesheet e prévia de fatura.

## Roteiro de avaliação

1. Iniciar uma tarefa, iniciar outra e conferir os dois períodos em Horas. Parar e retomar cria outro período.
2. Editar uma tarefa e mudar sua coluna. A movimentação independe do cronômetro.
3. Criar um registro manual sobreposto às 09h até 10h do dia 19/10/2026. Corrigir os horários depois do conflito.
4. Em Horas, preparar uma fatura. Conferir a exclusão do registro sem projeto, emitir, voltar a Horas e conferir o bloqueio.
5. Marcar a fatura como paga, desfazer a marcação e cancelar. Conferir a liberação das horas e a preservação do número.
6. Expandir “Simular situações e conferir estado”, alternar conexão com um cronômetro ativo e tentar parar. Reconectar e repetir.
7. Explorar cadastros, arquivamento, restauração e as três apresentações.

## Limites da demonstração

- PDFs são simulados. O CSV demonstra dados de períodos, sem valores monetários. Idioma e moeda dos documentos não têm implementação completa.
- A prévia de fatura está limitada ao primeiro cliente e aos registros de origem BRL. Demonstra a conversão do total para USD. Precisão e arredondamento finais devem seguir a resolução de faturas, não este cálculo simplificado.
- Não há persistência, sessão, servidor de aplicação, sincronização real nem recuperação entre dispositivos. O conflito entre dispositivos é um aviso simulado.
- As datas dos registros de exemplo são fixas. Alterar o fuso não recalcula a demonstração.
- Dados de cadastro e validações são propostas para revisão. Arquivamento em cascata e arquivamento da tarefa com cronômetro ativo aguardam decisão.
- Os controles de edição de registros não incluem divisão de um período. Esse fluxo ainda deve ser validado antes de encerrar o ticket.

Nenhum código deste protótipo deve ser tratado como implementação do aplicativo. O usuário aprovou o protótipo nesta sessão. Referência escolhida: variante B, com navegação no topo. O protótipo é preservado em branch descartável conforme a skill prototype. As limitações acima não são regras aprovadas do produto.

## Ajustes aprovados na revisão

- Filtro de tarefas ativas ou arquivadas por dropdown, alinhado à direita junto da engrenagem de gerenciar colunas.
- Editor de colunas em lista compacta, com arrastar e soltar, nome editável e remoção por ícone.
- Tooltip de Retomar último com atividade e projeto, incluindo Sem projeto quando necessário.
- Registros existentes em Horas abrem um accordion com edição na própria linha. Registros faturados continuam bloqueados.
