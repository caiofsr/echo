---
target: página de clientes
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
target_identity: "file:/Users/caio/Development/echo/src/components/directory/directory-page.tsx"
target_fingerprint: "sha256:513089f1bcc913d456ca828a4f387f9a923cab31c4705c3c23d68eeebc6cd940"
target_path: /Users/caio/Development/echo/src/components/directory/directory-page.tsx
timestamp: 2026-11-04T17-56-52Z
slug: src-components-directory-directory-page-tsx
---
Method: dual-agent (A: /root/clients_design_review · B: /root/clients_detector_review)

# Crítica da página de Clientes

**29/40 — boa base, com melhorias de eficiência e orientação.** Avaliada em tema escuro, desktop de 1280–1440 px e celular de 320–390 px, com dados fictícios. A decisão de manter Clientes e Projetos em duas listas foi preservada.

## Especificidade e impressão geral

O vocabulário, os ícones autorais e a apresentação de cliente, valor de hora e moeda situam bem o Echo no trabalho freelancer. A página ainda herda a composição de Configurações: muito preâmbulo e espaço vertical antes das ações. A maior oportunidade é fazer o trabalho útil aparecer mais cedo, especialmente no celular.

O detector retornou **zero achados** nos dois arquivos de página/formulários. A injeção no navegador também executou e informou zero antipadrões. Isso não equivale a uma aprovação completa de UX ou acessibilidade; os problemas abaixo surgiram na inspeção visual e de interação.

## Heurísticas

| Heurística | Nota /4 | Observação |
|---|---:|---|
| Visibilidade do estado | 3 | Erros visíveis; cronômetro indisponível ganha destaque excessivo. |
| Correspondência com o mundo real | 4 | Cliente, Projeto, valor de hora e moeda são claros. |
| Controle e liberdade | 3 | Cancelamento e confirmação de descarte funcionaram. |
| Consistência e padrões | 3 | Controles coerentes; validação nativa apareceu em inglês. |
| Prevenção de erros | 3 | Obrigatoriedade e valor inválido são bloqueados. |
| Reconhecimento em vez de memorização | 3 | Ações explícitas; localização depende de rolagem. |
| Flexibilidade e eficiência | 2 | Sem busca, filtro ou salto entre as duas listas. |
| Estética e minimalismo | 3 | Visual contido, com excesso de espaço e preparação no topo. |
| Recuperação de erros | 3 | Entrada inválida é preservada; foco pode continuar em Salvar. |
| Ajuda e documentação | 2 | Faltam exemplos contextuais nos campos. |
| **Total** | **29/40** | **Bom** |

## O que funciona

- Projetos mostram Cliente, valor por hora e moeda; a relação não depende apenas de cor.
- Foco inicial, contenção no diálogo e retorno ao gatilho funcionaram nas ações examinadas. Os alvos medidos tinham aproximadamente 44 px de altura.
- Cancelar uma edição pede confirmação e preserva o rascunho quando o descarte é rejeitado. O contraste das amostras de texto secundário foi 9,85:1; não foi uma auditoria universal de contraste.

## Prioridades

### 1. [P2] O topo esconde o trabalho útil no celular

Em 390×844, “Novo projeto” começou perto de **y=898**, fora da primeira tela, com apenas dois Clientes. O cronômetro indisponível ocupa espaço antes do título, seguido por introdução e outro título de Clientes.

**Impacto:** é preciso rolar bastante antes de gerenciar Projetos. **Correção:** compactar o estado indisponível e o preâmbulo, preservando as duas listas. O cronômetro pertence ao shell global, portanto essa mudança tem alcance além desta página. Fontes: `app-shell.tsx:63`, `directory-page.tsx:24`. **Comando sugerido:** `$impeccable layout`.

### 2. [P2] A validação obrigatória depende do idioma do navegador

Salvar um Cliente vazio exibiu **“Please fill out this field.”**. O `required` nativo intercepta o envio antes da mensagem portuguesa definida no formulário.

**Impacto:** a experiência em português fica inconsistente. **Correção:** unificar as mensagens em português e manter o foco no primeiro campo inválido. O idioma exato varia conforme o navegador. Fonte: `directory-forms.tsx:155`. **Comando sugerido:** `$impeccable harden`.

### 3. [P2] O formato do valor de hora é explicado depois do erro

Inserir `abc` mostra uma mensagem correta e preserva o formulário, mas o foco permanece em Salvar. Antes da tentativa, não há exemplo de preenchimento. A edição usa `80.50`, enquanto a lista apresenta `80,50`.

**Impacto:** a pessoa precisa descobrir a convenção por tentativa. **Correção:** adicionar exemplo como `120,35`, alinhar a apresentação localizada e levar o foco ao primeiro erro ou anunciar um resumo. Não foi testado um leitor de tela real. Fonte: `directory-forms.tsx:331`. **Comandos sugeridos:** `$impeccable clarify` e `$impeccable harden`.

### 4. [P2, hipótese de escala] Encontrar um registro depende de percorrer as listas

Não há busca, filtro ou salto para Projetos. Com dois Clientes e dois Projetos, a localização é simples; com listas maiores, todos os Projetos continuam depois de todos os Clientes.

**Impacto provável:** mais rolagem e comparação manual. Não houve teste com centenas de registros. **Possibilidade:** um atalho para Projetos e, se o volume justificar, busca por nome/Cliente, mantendo as listas separadas. Isso precisa de decisão de escopo, não é requisito confirmado. Fonte: `directory-page.tsx:55–150`. **Comando sugerido:** `$impeccable shape`.

## Carga cognitiva, jornada e personas

A carga é baixa nos formulários de quatro campos, mas aumenta na chegada pela repetição e pelo cronômetro sem ação. A jornada começa calma; a validação em outro idioma e a rolagem até Projetos introduzem pequenas frustrações.

- **Usuário frequente:** vai sentir primeiro a localização por rolagem quando o cadastro crescer.
- **Primeiro acesso:** entende Cliente e Projeto, mas se beneficiaria de exemplos de identificação fiscal e nome legal.
- **Pessoa que usa teclado:** os diálogos ofereceram foco e retorno previsíveis; o foco após erro de valor merece ajuste.

Observação menor: campos sem tokens de autocomplete exigem mais digitação no celular. Em 320×640, o diálogo de Cliente exige rolagem interna para chegar às ações, mas elas continuam acessíveis e não houve overflow horizontal.

## Perguntas para considerar

- Quanto espaço o cronômetro ainda indisponível deve ocupar numa página de gerenciamento?
- Com o volume real de cadastro, um salto para Projetos já resolveria a localização ou busca seria necessária?
