import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessQueryOptions } from "../queries/access";
import { SessionBoundary } from "../components/auth/session-boundary";
import { AppShell } from "../components/layout/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    if (!(await context.queryClient.fetchQuery(accessQueryOptions)))
      throw redirect({ to: "/login", search: { destination: location.href } });
  },
  component: () => (
    <SessionBoundary>
      <AppShell />
    </SessionBoundary>
  ),
});
