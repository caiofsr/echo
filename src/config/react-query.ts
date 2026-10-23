import type { QueryClientConfig } from "@tanstack/react-query";

export const queryClientConfig = {
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
} satisfies QueryClientConfig;
