import { queryOptions } from "@tanstack/react-query";
import { getBoard } from "../server/functions/board";

export const boardQueryOptions = queryOptions({
  queryKey: ["board"],
  queryFn: () => getBoard(),
});
export type Board = Awaited<ReturnType<typeof getBoard>>;
export type BoardColumn = Board["columns"][number];
export type Task = Board["tasks"][number];
export type BoardProject = Board["projects"][number];
