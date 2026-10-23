import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import {
  SessionBoundary,
  useSession,
} from "../../src/components/session-boundary";
import { useUnsavedChanges } from "../../src/components/use-unsaved-changes";

// Only bundled by the isolated browser fixture, never by the application build.
// Future forms use these same public hooks; no lifecycle internals are exposed.
function Draft() {
  const [value, setValue] = useState("");
  const { logout } = useSession();
  useUnsavedChanges(Boolean(value));
  return (
    <main>
      <h1>Formulário de teste</h1>
      <label>
        Rascunho
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <button onClick={() => void logout()}>Sair</button>
    </main>
  );
}
function Harness() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <button onClick={() => setMounted(!mounted)}>
        {mounted ? "Desmontar formulário" : "Montar formulário"}
      </button>
      {mounted && (
        <SessionBoundary>
          <Draft />
        </SessionBoundary>
      )}
    </>
  );
}
const queries = new QueryClient();
const root = createRootRoute({
  component: () => (
    <QueryClientProvider client={queries}>
      <Outlet />
    </QueryClientProvider>
  ),
});
const draft = createRoute({
  getParentRoute: () => root,
  path: "/__tests__/session.html",
  component: Harness,
});
const router = createRouter({ routeTree: root.addChildren([draft]) });
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
