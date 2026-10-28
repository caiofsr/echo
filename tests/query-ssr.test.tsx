import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  QueryClient,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { attachRouterServerSsrUtils } from "@tanstack/react-router/ssr/server";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getRouter } from "../src/router";

const routers: ReturnType<typeof getRouter>[] = [];
const clients: QueryClient[] = [];
afterEach(() => {
  for (const router of routers.splice(0)) {
    router.serverSsr?.setRenderFinished();
    router.serverSsr?.cleanup();
    router.options.context.queryClient.clear();
  }
  for (const client of clients.splice(0)) client.clear();
});

test("cada roteador SSR tem seu próprio cache de consultas", async () => {
  const first = getRouter();
  const second = getRouter();
  routers.push(first, second);
  const key = ["ssr-isolation"];
  await first.options.context.queryClient.fetchQuery({
    queryKey: key,
    queryFn: async () => "primeira requisição",
  });
  expect(second.options.context.queryClient.getQueryData(key)).toBeUndefined();
  await second.options.context.queryClient.fetchQuery({
    queryKey: key,
    queryFn: async () => "segunda requisição",
  });
  expect(first.options.context.queryClient.getQueryData(key)).toBe(
    "primeira requisição",
  );
  expect(second.options.context.queryClient.getQueryData(key)).toBe(
    "segunda requisição",
  );
});

test("integração oficial transfere o cache e consultas em streaming sem repetir a leitura", async () => {
  const server = getRouter();
  routers.push(server);
  attachRouterServerSsrUtils({ router: server, manifest: undefined });
  let reads = 0;
  const data = queryOptions({
    queryKey: ["ssr-hydration"],
    queryFn: async () => {
      reads++;
      return "Consulta do servidor";
    },
  });
  await server.options.context.queryClient.ensureQueryData(data);
  const dehydrated = await server.options.dehydrate!();
  expect(dehydrated).toBeDefined();

  const queryClient = new QueryClient({
    defaultOptions: server.options.context.queryClient.getDefaultOptions(),
  });
  clients.push(queryClient);
  const client = createRouter({
    routeTree: server.routeTree,
    context: { queryClient },
    history: createMemoryHistory(),
    isServer: false,
    origin: "https://echo.test",
  });
  setupRouterSsrQueryIntegration({ router: client, queryClient });
  await client.options.hydrate!(dehydrated);
  expect(await queryClient.fetchQuery(data)).toBe("Consulta do servidor");
  expect(reads).toBe(1);
  function Probe() {
    const { data: value } = useSuspenseQuery(data);
    return <p>{value}</p>;
  }
  const Provider = client.options.Wrap!;
  expect(
    renderToString(
      <Provider>
        <Probe />
      </Provider>,
    ),
  ).toContain("Consulta do servidor");

  const streamed = Promise.withResolvers<void>();
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (
      event.query.queryKey[0] === "ssr-stream" &&
      event.query.state.status === "success"
    )
      streamed.resolve();
  });
  try {
    await server.options.context.queryClient.fetchQuery({
      queryKey: ["ssr-stream"],
      queryFn: async () => "Consulta transmitida",
    });
    server.serverSsr!.setRenderFinished();
    await streamed.promise;
    expect(queryClient.getQueryData(["ssr-stream"])).toBe(
      "Consulta transmitida",
    );
  } finally {
    unsubscribe();
  }
});
