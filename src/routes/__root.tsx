import { Toaster } from "../components/ui/sonner";
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
        { name: "theme-color", content: "#365b3e" },
        { title: "Echo · Seu trabalho, no seu ritmo" },
      ],
      links: [
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "stylesheet", href: styles },
      ],
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
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
