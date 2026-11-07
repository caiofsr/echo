import { createFileRoute } from "@tanstack/react-router";
import { BoardPage } from "../components/board/board-page";
import { boardQueryOptions } from "../queries/board";

export const Route = createFileRoute("/_app/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(boardQueryOptions),
  component: BoardPage,
});
