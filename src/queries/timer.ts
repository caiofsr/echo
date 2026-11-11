import { queryOptions } from "@tanstack/react-query";
import { getTimer } from "../server/functions/timer";
export const timerQueryOptions = queryOptions({
  queryKey: ["timer"],
  queryFn: () => getTimer(),
  staleTime: 0,
  refetchInterval: 3000,
  refetchOnWindowFocus: "always",
});
