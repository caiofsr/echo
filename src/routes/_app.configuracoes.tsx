import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/app-shell";
export const Route = createFileRoute("/_app/configuracoes")({
  component: () => (
    <Unavailable
      title="Configurações"
      description="Aqui você vai ajustar suas preferências, empresa e dados de pagamento."
      icon="configuracoes"
    />
  ),
});
