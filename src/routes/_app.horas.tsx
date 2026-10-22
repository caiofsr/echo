import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/app-shell";
export const Route = createFileRoute("/_app/horas")({
  component: () => (
    <Unavailable
      title="Horas"
      description="Aqui você vai consultar seus registros de horas e preparar timesheets."
      icon="horas"
    />
  ),
});
