---
target: tela de settings
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/Users/caio/Development/echo/src/components/settings/settings-page.tsx"
target_fingerprint: "sha256:67a141646db643b56b5ddc5d2b9510b262c5ded1a538612270ec3858a93fbce3"
target_path: /Users/caio/Development/echo/src/components/settings/settings-page.tsx
timestamp: 2026-10-29T03-32-50Z
slug: src-components-settings-settings-page-tsx
---

# Crítica de Configurações

Método: duas avaliações independentes, design e detector/evidências.

## Heurísticas

| Heurística           | Nota / 4 | Observação                                              |
| -------------------- | -------- | ------------------------------------------------------- |
| Estado do sistema    | 3        | Confirmações e carregamento visíveis                    |
| Linguagem do usuário | 3        | Termos próximos da tarefa, com dúvidas sobre instruções |
| Controle e liberdade | 2        | Cancelar novo cadastro descarta rascunho sem aviso      |
| Consistência         | 2        | Criação inline e edição em modal                        |
| Prevenção de erros   | 2        | Descarte silencioso durante criação                     |
| Reconhecimento       | 3        | Ações identificadas, arquivados recolhidos              |
| Eficiência           | 2        | Padrões diferentes para criar e editar                  |
| Estética             | 3        | Tela contida e organizada                               |
| Recuperação          | 3        | Erros e rascunhos de edição tratados                    |
| Ajuda                | 2        | Pouca orientação sobre conteúdo e uso na fatura         |
| Total                | 25/40    | Aceitável                                               |

## Impressão

Organização clara para uma ferramenta de trabalho, com identidade expressa principalmente na linguagem; composição genérica é adequada ao uso. O maior problema é a perda silenciosa de dados ao cancelar um novo cadastro.

## Pontos fortes

- Seções de empresas e formas de recebimento separam tarefas.
- Confirmação de sucesso e retorno de foco ajudam a acompanhar as ações.
- Arquivamento é reversível e não polui a lista ativa.

## Problemas prioritários

1. **P1 — Cancelar um cadastro novo descarta o rascunho sem confirmação.** Tanto empresa quanto forma de recebimento só confirmam descarte em edição. Pedir confirmação quando houver dados alterados. Comando: `$impeccable harden`.
2. **P2 — Arquivamento sem explicação imediata de seu efeito ou desfazer visível.** A restauração existe na seção recolhida, mas pode passar despercebida. Explicar o efeito e oferecer caminho claro para restaurar. Comando: `$impeccable clarify`.
3. **P2 — Criar é inline e editar usa modal.** Fluxos semelhantes apresentam estruturas diferentes; é uma inconsistência, não uma falha comprovada de uso. Avaliar consistência sem presumir que ambos devam virar modal. Comando: `$impeccable shape`.
4. **P2 — Instruções de recebimento têm orientação genérica.** Há exemplo para o rótulo, mas não para as instruções; explicar com exemplo fictício curto o que a pessoa deve informar. Comando: `$impeccable clarify`.

## Personas e carga cognitiva

- Pessoa no celular: pode perder dados ao cancelar um cadastro iniciado.
- Pessoa que configura pela primeira vez: pode ter dúvida sobre as instruções e o efeito de arquivar.
- Pessoa que usa teclado: o foco retorna após edição; não foi feita auditoria completa com leitor de tela.

Carga baixa a moderada: seções e divulgação progressiva ajudam; múltiplas ações aparecem agrupadas por item, sem constituir uma única decisão.

## Observações

O detector de código retornou zero achados; isso não confirma ausência de problemas de acessibilidade. As capturas de desktop e celular cobrem a lista e o modal, não todas as telas ou estados.

## Perguntas para considerar

A recuperação do cadastro deve ser uniforme em criação e edição? Qual orientação sobre arquivamento ajuda sem prometer comportamento de faturas ainda não implementado?
