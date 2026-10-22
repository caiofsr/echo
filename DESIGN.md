---
name: Echo
description: Interface pessoal de trabalho no modo Operate, herdada da variante B aprovada.
colors:
  primary: "#365b3e"
  primary-hover: "#27482f"
  background: "#f5f5f0"
  foreground: "#252c29"
  surface: "#fdfdf8"
  white: "#ffffff"
  muted: "#59665b"
  border: "#d6dcd3"
  input-border: "#9aa797"
  focus: "#426b48"
  error: "#9e3636"
  selected: "#e6eddf"
  selected-text: "#284b30"
  nav-hover: "#edf0e7"
  icon-fill: "#d6e4cc"
typography:
  headline:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.8rem, 4vw, 2.35rem)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontSize: "1.8rem"
    fontWeight: 650
    letterSpacing: "-0.035em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
  label:
    fontSize: "0.9rem"
    fontWeight: 550
  supporting:
    fontSize: "0.8rem"
  timer:
    fontFamily: "ui-monospace, monospace"
    fontSize: "1.5rem"
rounded:
  control: "8px"
  container: "12px"
spacing:
  compact: "0.5rem"
  regular: "1rem"
  section: "1.5rem"
  spacious: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.8rem"
  navigation-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.selected-text}"
    rounded: "{rounded.control}"
    padding: "0.65rem 0.9rem"
---

# Design System: Echo

## Overview

**Creative North Star: "Operate"**

Echo usa uma interface de trabalho pessoal em português. O sistema implementado herda a variante B aprovada: fundo claro levemente quente, verde nas ações e navegação no topo. O conteúdo usa uma coluna central larga no aplicativo e uma coluna curta no acesso.

Este documento registra `src/styles.css`, os componentes locais e a interface atual. Os espaços de Quadro, Horas, Faturas e Cadastros ainda apresentam estados de indisponibilidade. Sua aparência não comprova entrega dos fluxos planejados, teste remoto ou implantação.

**Key Characteristics:**

- Verde para ações, seleção e desenhos dos ícones.
- Tipografia de sistema, bordas finas e controles arredondados.
- Navegação superior que ocupa uma segunda linha no celular.

## Colors

O verde acompanha neutros quentes; os tokens do frontmatter são normativos.

### Primary

O verde primário identifica ações principais e traços dos ícones. O verde mais escuro aparece no hover do botão principal. A seleção usa fundo verde claro e texto verde escuro.

### Neutral

O fundo geral usa `background`. Cabeçalho usa `surface`; campos e o painel do cronômetro usam branco. `foreground` identifica títulos e texto principal. `muted` identifica descrições e ações secundárias. `border` separa o cabeçalho e contorna botões secundários; campos usam `input-border`.

O foco usa `focus`; mensagens e bordas de campos inválidos usam `error`.

**The Selection Rule.** Mostre a página atual com fundo de seleção, texto escuro e `aria-current="page"`.

## Typography

A interface usa a pilha de sistema registrada em `typography.body`. Não há fonte de exibição separada. Dígitos do cronômetro usam monoespaçada e numerais tabulares.

O título de acesso usa `headline`; títulos internos usam `title`. O subtítulo dos estados vazios tem tamanho de 1.1rem e peso 600. Rótulos e botões usam `label`; notas usam `supporting`. Descrições longas usam entrelinha 1.65, e a descrição do estado vazio ocupa até 40ch.

A marca textual tem tamanho de 1.8rem, peso 750, entrelinha 1 e espaçamento de letras de -0.04em. Seu ponto usa verde atenuado.

## Layout

O aplicativo usa cabeçalho horizontal com marca, quatro destinos e ações de sessão. O conteúdo tem largura máxima de 1440px, margem automática e preenchimento de 2rem 2.5rem 4rem. O painel do cronômetro precede o conteúdo da rota.

Até 720px, o cabeçalho quebra linha. A navegação ocupa quatro colunas iguais na segunda linha, com ícone acima do texto. O conteúdo usa preenchimento de 1.25rem 1rem 3rem. A interface tem largura mínima de 320px. O ícone do painel do cronômetro fica oculto nesse intervalo e seus dígitos passam a 1.15rem.

O acesso ocupa pelo menos a altura visível da janela. O formulário tem largura máxima de 25rem e margem automática. A página usa preenchimento lateral fluido entre 1.5rem e 5rem no desktop e 1.5rem no celular.

## Elevation & Depth

Os componentes atuais não usam sombras. Bordas e diferenças de fundo separam as áreas. O estado vazio usa uma camada verde clara translúcida, enquanto campos e cronômetro usam branco.

**The Flat Surface Rule.** Preserve a separação por fundo e borda nos componentes atuais.

## Shapes

Controles e links de navegação usam o raio `control`; painéis e estados vazios usam `container`. Botões e campos têm bordas de 1px. Os ícones locais usam viewBox 24 por 24, contorno de 1.65 e terminações arredondadas.

## Components

### Buttons

Os botões têm altura mínima de 2.75rem, texto de 0.9rem, peso 550 e espaço interno de 0.65rem 1rem. A variante principal usa verde e texto branco. A variante outline usa branco e borda neutra. A variante ghost usa fundo transparente e texto secundário. Outline e ghost recebem fundo de seleção no hover. A transição de fundo dura 0.15s. O estado desabilitado usa opacidade 0.55 e cursor de espera.

### Inputs / Fields

Campos ocupam toda a largura, têm altura mínima de 3rem, texto de 1rem e preenchimento de 0.8rem. O rótulo fica acima com intervalo de 0.55rem. O controle de visibilidade da senha ocupa o lado direito do campo; o texto reserva 3.5rem desse lado. Campos inválidos recebem borda de erro.

Todos os controles interativos usam contorno de foco de 2px, afastado 4px. O link para pular ao conteúdo aparece ao receber foco.

### Navigation

Links superiores combinam ícones de 17px e texto de 0.9rem. A página selecionada usa peso 600. No celular, o texto passa a 0.78rem. Configurações usa ícone de 19px, nome acessível e o mesmo tratamento de seleção. Sair combina texto e ícone.

### Cards / Containers

O painel do cronômetro usa borda verde clara, preenchimento de 1.1rem 1.4rem e alinhamento horizontal. O estado vazio centraliza ícone de 32px, título, descrição e indicação de disponibilidade. Sua altura mínima passa de 340px para 320px no celular.

### Icons

`public/icons` guarda os SVGs locais editáveis. `EchoIcon` encapsula a geometria em SVG nativo, sem IDs ou referências externas. As versões atuais são desenhos simplificados para tamanhos pequenos, com preenchimento verde claro e contornos verdes. Não representam materiais ou volume 3D. Ícones decorativos usam `aria-hidden`; o controle deve fornecer o nome acessível. No botão principal, o traço herda a cor do texto.

### Motion

O indicador de carregamento gira em um segundo, linearmente. A preferência por movimento reduzido remove animações e transições.

## Do's and Don'ts

### Do:

- **Do** reutilize os tokens e as variantes locais de botão e campo.
- **Do** preserve foco visível, rótulos em português e nomes acessíveis em ações com ícones.
- **Do** mantenha a navegação superior em quatro colunas no intervalo móvel implementado.
- **Do** use as versões SVG simplificadas locais nos tamanhos pequenos.

### Don't:

- **Don't** descreva os ícones pequenos atuais como ilustrações 3D.
- **Don't** apresente os estados de indisponibilidade como fluxos concluídos.
- **Don't** acrescente sombras aos componentes documentados como planos.
