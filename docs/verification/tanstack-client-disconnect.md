# AbortError ao encerrar uma conexão

Ao fechar o navegador ou cancelar uma requisição, o TanStack Start pode registrar um `AbortError` no servidor. Esse caso foi reproduzido sem o Echo ou o Better Auth: o tratamento de erros do Start pode registrar o motivo do cancelamento e gerar uma resposta 500 depois que o cliente já se desconectou.

A [issue TanStack Router #8521](https://github.com/TanStack/router/issues/8521) descreve o problema e a [PR #8536](https://github.com/TanStack/router/pull/8536) propõe uma correção. Na investigação de outubro de 2026, ela ainda não estava publicada. Ao atualizar o TanStack, verifique o estado da correção e reproduza o cancelamento antes de concluir que foi resolvido.

Não trate todo `AbortError` como desconexão esperada: outros cancelamentos podem indicar problemas no fluxo da aplicação.
