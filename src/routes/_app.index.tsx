import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/app-shell";
export const Route = createFileRoute("/_app/")({
  component: () => (
    <Unavailable
      title="Quadro"
      description="Aqui você vai organizar suas tarefas e acompanhar o trabalho em andamento."
      icon="board"
    />
  ),
});
