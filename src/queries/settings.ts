import { queryOptions } from "@tanstack/react-query";
import { getSettings } from "../server/functions/settings";

export const settingsQueryOptions = queryOptions({
  queryKey: ["settings"],
  queryFn: () => getSettings(),
});
