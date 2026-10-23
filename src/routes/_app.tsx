import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasSession } from "../server/session";
import { SessionBoundary } from "../components/session-boundary";
import { AppShell } from "../components/app-shell";
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    if (!(await hasSession()))
      throw redirect({ to: "/login", search: { destination: location.href } });
  },
  component: () => (
    <SessionBoundary>
      <AppShell />
    </SessionBoundary>
  ),
});
