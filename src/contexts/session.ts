import { createStoreContext } from "@tanstack/react-store";
import type { useSessionLifecycle } from "../hooks/use-session-lifecycle";

export const { StoreProvider: SessionProvider, useStoreContext: useSession } =
  createStoreContext<
    Pick<ReturnType<typeof useSessionLifecycle>, "logout" | "setDirty">
  >();
