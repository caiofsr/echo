import { queryOptions } from "@tanstack/react-query";
import { getDirectory } from "../server/functions/directory";

export const directoryQueryOptions = queryOptions({
  queryKey: ["directory"],
  queryFn: () => getDirectory(),
});
export type Directory = Awaited<ReturnType<typeof getDirectory>>;
export type Client = Directory["clients"][number];
export type Project = Directory["projects"][number];
