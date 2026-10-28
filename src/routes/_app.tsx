import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessQueryOptions } from "../queries/access";
import { ReauthenticationBoundary } from "../components/auth/reauthentication-boundary";
import { AppShell } from "../components/layout/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    if (!(await context.queryClient.fetchQuery(accessQueryOptions)))
      throw redirect({ to: "/login", search: { destination: location.href } });
  },
  component: () => (
    <ReauthenticationBoundary>
      <AppShell />
    </ReauthenticationBoundary>
  ),
});
