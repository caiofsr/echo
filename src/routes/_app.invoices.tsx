import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/ui/unavailable";

export const Route = createFileRoute("/_app/invoices")({
  component: () => (
    <Unavailable
      title="Faturas"
      description="Aqui você vai emitir e acompanhar suas faturas."
      icon="invoices"
    />
  ),
});
