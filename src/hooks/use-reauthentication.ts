import { useEffect, useEffectEvent, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCreateStore, useSelector } from "@tanstack/react-store";
import { authClient } from "../lib/auth-client";

export function useReauthentication() {
  const session = authClient.useSession();
  const { data, isPending, isRefetching, error, refetch } = session;
  // UI latches only: the native session is never copied into this store.
  const store = useCreateStore({
    reauthenticationRequired: false,
    restoring: false,
  });
  const { reauthenticationRequired, restoring } = useSelector(
    store,
    (state) => state,
  );
  const lastActivity = useRef(0);
  const router = useRouter();
  const queries = useQueryClient();

  useEffect(() => {
    if (isPending || isRefetching || error) return;
    store.setState((state) => ({
      reauthenticationRequired: state.reauthenticationRequired || !data,
      restoring: false,
    }));
  }, [data, isPending, isRefetching, error, store]);

  const renewOnActivity = useEffectEvent(() => {
    if (
      document.visibilityState !== "visible" ||
      reauthenticationRequired ||
      restoring ||
      isPending ||
      isRefetching ||
      Date.now() - lastActivity.current < 60_000
    )
      return;
    lastActivity.current = Date.now();
    // Omit the flag: Better Auth's HTTP schema coerces the string "false" to true.
    void refetch({ query: { disableRefresh: undefined } });
  });
  const checkRestoredPage = useEffectEvent((event: PageTransitionEvent) => {
    if (!event.persisted) return;
    store.setState((state) => ({ ...state, restoring: true }));
    void refetch();
  });

  useEffect(() => {
    const visibility = () => {
      if (document.visibilityState === "visible") renewOnActivity();
    };
    document.addEventListener("pointerdown", renewOnActivity);
    document.addEventListener("keydown", renewOnActivity);
    document.addEventListener("scroll", renewOnActivity, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", checkRestoredPage);
    return () => {
      document.removeEventListener("pointerdown", renewOnActivity);
      document.removeEventListener("keydown", renewOnActivity);
      document.removeEventListener("scroll", renewOnActivity);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", checkRestoredPage);
    };
  }, []);

  async function resumeAfterLogin() {
    queries.clear();
    await router.invalidate({ sync: true });
    store.setState(() => ({
      reauthenticationRequired: false,
      restoring: false,
    }));
  }
  return { reauthenticationRequired, restoring, resumeAfterLogin };
}
