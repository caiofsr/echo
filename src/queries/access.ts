import { queryOptions } from "@tanstack/react-query";
import { hasSession } from "../server/functions/session";

// Route access always consults the server, including after a preload. This is
// navigation state, not authorization for future private reads or mutations.
export const accessQueryOptions = queryOptions({
  queryKey: ["access", "authenticated"],
  queryFn: ({ signal }) => hasSession({ signal }),
  staleTime: 0,
});
