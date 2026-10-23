import { createFileRoute } from "@tanstack/react-router";
import { Unavailable } from "../components/ui/unavailable";

export const Route = createFileRoute("/_app/")({
  component: () => (
    <Unavailable
      title="Quadro"
      description="Aqui você vai organizar suas tarefas e acompanhar o trabalho em andamento."
      icon="board"
    />
  ),
});
