import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/app-shell";
export const Route = createFileRoute("/_app/faturas")({
  component: () => (
    <Unavailable
      title="Faturas"
      description="Aqui você vai emitir e acompanhar suas faturas."
      icon="faturas"
    />
  ),
});
