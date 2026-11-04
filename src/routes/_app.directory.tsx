import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/directory")({
  beforeLoad: () => {
    throw redirect({ to: "/clients", replace: true });
  },
});
