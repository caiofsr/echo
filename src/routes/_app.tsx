import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessQueryOptions } from "../lib/access-query";
import { SessionBoundary } from "../components/session-boundary";
import { AppShell } from "../components/app-shell";

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
