---
target: a página de configuração
total_score: 26
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
target_identity: "file:/Users/caio/Development/echo/src/routes/_app.settings.tsx"
target_fingerprint: "sha256:39794f653e6fd384d5b01834c2f1411eb30541d1bbde86b61566c7304b9836f5"
target_path: /Users/caio/Development/echo/src/routes/_app.settings.tsx
timestamp: 2026-10-29T02-40-02Z
slug: src-routes-app-settings-tsx
---

Method: dual-agent (A: /root/critique_design · B: /root/critique_evidence)

# Crítica Impeccable — Configurações

**Alvo:** `/settings` — `src/routes/_app.settings.tsx` e `SettingsPage`.
**Modo:** Operate.
**Especificidade:** Moderadamente específica ao Echo. A tela separa os dados de quem emite a fatura das instruções de recebimento, mas a estrutura visual é a de um formulário de configurações familiar; a personalidade vem principalmente dos rótulos e da cópia.

## Saúde do design

| #         | Heurística                           |                  Nota | Evidência principal                                                                                                      |
| --------- | ------------------------------------ | --------------------: | ------------------------------------------------------------------------------------------------------------------------ |
| 1         | Visibilidade do estado               |                     2 | Salvar a empresa mostra confirmação; ao salvar dados de pagamento, o formulário fecha antes que o status seja anunciado. |
| 2         | Correspondência com o mundo real     |                     3 | A linguagem de faturas é clara, mas “Identificação fiscal” não diz qual identificador preencher.                         |
| 3         | Controle e liberdade                 |                     3 | É possível cancelar formulários, mas não retirar um conjunto de pagamento antigo.                                        |
| 4         | Consistência e padrões               |                     3 | A tela segue os controles do Echo, com diferença no feedback de salvamento entre empresa e pagamento.                    |
| 5         | Prevenção de erros                   |                     2 | O campo fiscal não tem exemplo e os campos opcionais não são identificados como opcionais.                               |
| 6         | Reconhecimento em vez de memorização |                     3 | Campos e conjuntos salvos ficam visíveis e têm rótulos.                                                                  |
| 7         | Flexibilidade e eficiência           |                     2 | Os conjuntos são editados um de cada vez; não há ação rápida para vários deles.                                          |
| 8         | Estética e minimalismo               |                     3 | A tela é limpa, mas o aviso de cronômetro indisponível compete com a tarefa de configurações.                            |
| 9         | Recuperação de erros                 |                     3 | Os formulários mantêm os valores e mostram erros; o salvamento de pagamento não anuncia sucesso.                         |
| 10        | Ajuda e documentação                 |                     2 | Há orientação breve, mas falta explicar o campo fiscal e o efeito das alterações em faturas existentes.                  |
| **Total** |                                      | **26/40 — Aceitável** | Melhor oportunidade: clareza e confirmação ao editar dados que afetam o recebimento.                                     |

## Carga cognitiva

**Moderada — 2 falhas na lista de verificação.**

- O painel “Cronômetro global — Disponível em uma próxima entrega” aparece antes da tarefa e ocupa espaço sem oferecer uma ação nessa tela.
- O cabeçalho mostra cinco destinos de navegação simultaneamente. Os grupos da tela estão bem separados e os formulários de pagamento só aparecem ao adicionar ou editar.

## O que funciona

- As seções correspondem ao fluxo de faturamento: “Empresa” identifica quem emite; “Dados de pagamento” explica que os conjuntos serão escolhidos na emissão.
- A hierarquia é contida e legível. Os campos ficam em duas colunas no desktop e empilham no celular.
- Os controles têm rótulos associados, marcam os campos obrigatórios e usam preenchimento automático apropriado para organização, telefone e endereço.

## Prioridades

1. **[P2] O salvamento de pagamento não confirma a ação e pode perder o foco.**
   Ao salvar, o editor é removido; com ele desaparece a região `role="status"`. O botão que abriu o formulário também já não está na tela. Isso pode deixar quem usa teclado ou leitor de tela sem confirmação e sem uma posição clara para continuar.
   **Correção sugerida:** anunciar o resultado numa região persistente e mover o foco para o formulário ao abri-lo; ao salvar ou cancelar, devolver o foco à ação ou ao conjunto correspondente.
   **Comando sugerido:** `$impeccable harden`.

2. **[P2] Não há como retirar um conjunto de pagamento desatualizado.**
   Cada conjunto salvo só oferece “Editar”. Instruções de banco ou PIX antigas podem continuar disponíveis para escolha em faturas futuras.
   **Correção sugerida:** definir uma ação de arquivar ou retirar das opções futuras, preservando os dados já registrados em faturas emitidas.
   **Comando sugerido:** `$impeccable shape`.

3. **[P2] “Identificação fiscal” não deixa claro o dado esperado nem que o campo é opcional.**
   A decisão de produto registrada menciona CNPJ, enquanto a tela usa um termo genérico. Isso pode fazer a pessoa hesitar ou deixar de preencher o dado.
   **Correção sugerida:** usar um rótulo como “CNPJ (opcional)” — ou explicar que aceita CNPJ e outros identificadores — e dar um exemplo curto.
   **Comando sugerido:** `$impeccable clarify`.

## Alertas por perfil

- **Jordan, primeira utilização:** pode parar no campo “Identificação fiscal” para perguntar se deve informar CNPJ ou outro dado e se pode deixar em branco.
- **Sam, acessibilidade:** campos e títulos são semânticos, mas abrir ou salvar um editor remove o elemento em foco; a confirmação de salvamento pode não ser anunciada.
- **Casey, uso distraído no celular:** a composição empilha cabeçalho, navegação, aviso do cronômetro, introdução e dados da empresa antes da ação de salvar. Uma interrupção antes do salvamento deixa as alterações pendentes.

## Observações menores

- As capturas desktop e mobile mostram “Pular para o conteúdo” sobre o formulário. O CSS exibe esse link quando recebe foco; pode ser um artefato da captura de página inteira. A inspeção ao vivo não estava disponível para confirmar.
- O atalho de Configurações no cabeçalho usa somente o ícone de engrenagem, mas tem nome acessível e o título da página identifica o local.
- Ao entregar o fluxo de faturas, uma nota dizendo que alterações nos cadastros não mudam documentos emitidos pode tranquilizar quem edita dados financeiros.

## Perguntas para considerar

- O campo é especificamente para CNPJ ou deve aceitar outros identificadores fiscais? Deve indicar “opcional”?
- Você quer uma ação para arquivar conjuntos que não devem ser usados em novas faturas?
- Vale a pena informar nessa tela que mudanças não alteram faturas já emitidas?
