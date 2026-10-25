# AbortError ao encerrar o navegador

Investigação de 25 de outubro de 2026. Não foi encontrada uma correção publicada na versão estável do TanStack Start. Não foram alterados código de autenticação, dependências ou tratamento de erros do Echo.

## Reprodução

Com Vite e banco temporário isolado, interromper requisições a `/login` após 2 ms reproduziu o mesmo `DOMException` do encerramento do navegador. Dois lotes de 20 cancelamentos geraram, respectivamente, 13 e 11 registros de `AbortError` no servidor. O teste falhou ao exigir zero registros. Nenhum login é necessário para reproduzir.

O caso foi reduzido à função `createServerEntry` do próprio Start. Execute este exemplo com Bun ou Node, a partir da raiz do repositório:

```js
// Salve temporariamente como disconnect-repro.mjs na raiz do projeto.
import { createServerEntry } from "./node_modules/@tanstack/start-server-core/dist/esm/internal-request-response.js";

const controller = new AbortController();
const entry = createServerEntry({
  fetch: async (request) => {
    await new Promise((resolve) => {
      request.signal.addEventListener("abort", resolve, { once: true });
    });
    request.signal.throwIfAborted();
    return new Response("unreachable");
  },
});
const response = entry.fetch(
  new Request("http://localhost/disconnect", { signal: controller.signal }),
  {},
);
controller.abort();
console.log("response status:", (await response).status);
```

Esse exemplo usa um módulo interno apenas para diagnóstico, não como API da aplicação. O entry padrão do React Start delega a essa mesma função. O exemplo produz `AbortError` e uma resposta 500, sem Echo, Better Auth, SQLite, Vite ou srvx.

## Versões verificadas

Os pacotes publicados foram consultados diretamente no registro npm. O último pacote foi baixado para uma pasta temporária, sem instalar ou modificar o lockfile do projeto.

| Pacote                        | Instalado | Última versão estável consultada |
| ----------------------------- | --------- | -------------------------------- |
| `@tanstack/react-start`       | 1.169.3   | 1.169.4                          |
| `@tanstack/start-server-core` | 1.169.44  | 1.169.45                         |
| `@tanstack/start-plugin-core` | 1.171.54  | 1.171.55                         |
| `srvx`                        | 1.0.6     | 1.0.7                            |

O teste mínimo registrou `AbortError` e retornou 500 nas quatro combinações: core instalado/Bun, core instalado/Node, core publicado/Bun e core publicado/Node. Portanto, trocar apenas o runtime não elimina essa causa.

Os arquivos `internal-request-response.ts` do core e `vite/dev-server-plugin/plugin.ts` do plugin são idênticos entre as versões instaladas e as últimas publicadas consultadas. As mudanças do srvx 1.0.7 tratam Response, herança das classes nativas e Content-Length; o teste mínimo demonstra a falha sem esse adaptador.

## Causa e correção oficial

Quando a conexão é encerrada, o pipeline pode rejeitar com `request.signal.reason`. O fallback de `createServerEntry` encaminha essa rejeição para `handleStartError`. Sem metadados de erro HTTP, o caminho padrão registra o erro e cria uma resposta 500, embora o cliente já tenha encerrado a conexão.

A [issue oficial #8521](https://github.com/TanStack/router/issues/8521) descreve esse comportamento. A [PR oficial #8536](https://github.com/TanStack/router/pull/8536) propõe tratar, no próprio Start, somente a rejeição que seja exatamente o motivo do cancelamento da requisição. Os demais erros manteriam o caminho de diagnóstico normal.

A API do GitHub confirmou `state: open`, `merged: false` e `merged_at: null` para essa PR na data da investigação. A versão 1.169.45 ainda não inclui a alteração proposta.

## Resultado para o Echo

Não há atualização estável verificada que resolva esse caso. Não foram adicionados filtros de console, opções de silêncio, wrappers de erro, patches em node_modules ou dependências de uma branch não publicada. O próximo passo é revalidar o mesmo caso quando a correção oficial for publicada e, então, atualizar o TanStack.

O resultado não significa que todo `AbortError` deva ser ignorado. Ele identifica especificamente o registro incorreto do motivo nativo de uma requisição cancelada pelo cliente.
