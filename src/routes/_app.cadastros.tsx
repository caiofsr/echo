import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/app-shell";
export const Route = createFileRoute("/_app/cadastros")({
  component: () => (
    <Unavailable
      title="Cadastros"
      description="Aqui você vai cadastrar clientes e projetos."
      icon="cadastros"
    />
  ),
});
