import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import styles from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Echo · Seu trabalho, no seu ritmo" },
      ],
      links: [{ rel: "stylesheet", href: styles }],
    }),
    component: Root,
    notFoundComponent: () => (
      <main className="reauth">
        <h1>Página não encontrada</h1>
        <a href="/">Voltar ao Echo</a>
      </main>
    ),
    errorComponent: () => (
      <main className="reauth">
        <h1>Não foi possível abrir o Echo</h1>
        <p>Confira sua conexão e tente novamente.</p>
        <a href="/">Tentar novamente</a>
      </main>
    ),
  },
);
function Root() {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
