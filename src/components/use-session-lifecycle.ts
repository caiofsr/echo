import { useCallback, useEffect, useRef } from "react";
import { getGlobalBroadcastChannel } from "better-auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCreateStore, useSelector } from "@tanstack/react-store";
import { authClient } from "../lib/auth-client";

// Native authentication is observed here. Echo owns visible activity, draft
// coordination and what happens when access expires or is explicitly ended.
export function useSessionLifecycle() {
  const store = useCreateStore({
    status: "active" as "active" | "expired" | "checking",
    connectionError: "",
    dirtyForms: new Set<string>(),
    otherDirtyTabs: new Set<string>(),
    lastActivity: 0,
  });
  const status = useSelector(store, (state) => state.status);
  const connectionError = useSelector(store, (state) => state.connectionError);
  const setStatus = useCallback(
    (value: "active" | "expired" | "checking") =>
      store.setState((state) => ({ ...state, status: value })),
    [store],
  );
  const setConnectionError = useCallback(
    (value: string) =>
      store.setState((state) => ({ ...state, connectionError: value })),
    [store],
  );
  const session = authClient.useSession();
  const { refetch } = session;
  const tabId = useRef("");
  const channel = useRef<BroadcastChannel | null>(null);
  const router = useRouter();
  const queries = useQueryClient();
  const leave = useCallback(() => {
    store.setState((state) => ({ ...state, dirtyForms: new Set<string>() }));
    queries.clear();
    setStatus("checking");
    return router.navigate({
      href: "/login",
      reloadDocument: true,
      replace: true,
    });
  }, [queries, router, store, setStatus]);
  const check = useCallback(
    async (active = false) => {
      // Omit the native flag for renewal: the HTTP schema coerces the string
      // "false" to true. Undefined also overrides the client's passive default.
      await refetch({ query: { disableRefresh: active ? undefined : true } });
    },
    [refetch],
  );
  useEffect(() => {
    if (session.isPending || session.isRefetching || session.error) return;
    if (!session.data) setStatus("expired");
    else {
      if (store.state.status === "checking") setStatus("active");
      setConnectionError("");
    }
  }, [
    session.data,
    session.isPending,
    session.isRefetching,
    session.error,
    store,
    setStatus,
    setConnectionError,
  ]);
  useEffect(
    () =>
      getGlobalBroadcastChannel().subscribe((message) => {
        if (message.data?.trigger === "signout") void leave();
      }),
    [leave],
  );
  useEffect(() => {
    channel.current = new BroadcastChannel("echo-session");
    tabId.current ||= crypto.randomUUID();
    channel.current.onmessage = (event) => {
      const message = event.data;
      if (message?.type === "dirty" && typeof message.tab === "string") {
        store.setState((state) => {
          const otherDirtyTabs = new Set(state.otherDirtyTabs);
          if (message.value) otherDirtyTabs.add(message.tab);
          else otherDirtyTabs.delete(message.tab);
          return { ...state, otherDirtyTabs };
        });
      }
      if (message?.type === "hello")
        channel.current?.postMessage({
          type: "dirty",
          tab: tabId.current,
          value: store.state.dirtyForms.size > 0,
        });
    };
    channel.current.postMessage({ type: "hello" });
    const pageHide = () =>
      channel.current?.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: false,
      });
    window.addEventListener("pagehide", pageHide);
    const pageShow = () => {
      store.setState((state) => ({
        ...state,
        otherDirtyTabs: new Set<string>(),
      }));
      channel.current?.postMessage({ type: "hello" });
      channel.current?.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: store.state.dirtyForms.size > 0,
      });
    };
    window.addEventListener("pageshow", pageShow);
    return () => {
      pageHide();
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", pageShow);
      channel.current?.close();
      channel.current = null;
    };
  }, [store]);
  useEffect(() => {
    const activity = () => {
      if (
        document.visibilityState !== "visible" ||
        Date.now() - store.state.lastActivity < 60_000 ||
        status !== "active"
      )
        return;
      store.setState((state) => ({ ...state, lastActivity: Date.now() }));
      void check(true);
    };
    const visibility = () => {
      if (document.visibilityState === "visible") activity();
    };
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setStatus("checking");
        void check();
      }
    };
    document.addEventListener("pointerdown", activity);
    document.addEventListener("keydown", activity);
    document.addEventListener("scroll", activity, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", pageShow);
    if (status === "active") activity();
    else void check();
    return () => {
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
      document.removeEventListener("scroll", activity);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", pageShow);
    };
  }, [check, status, store, setStatus]);
  async function logout() {
    if (
      (store.state.dirtyForms.size > 0 ||
        store.state.otherDirtyTabs.size > 0) &&
      !window.confirm(
        "Sair e descartar as alterações não salvas em todas as abas deste navegador?",
      )
    )
      return;
    try {
      const { error } = await authClient.signOut();
      if (error && error.status !== 401) throw new Error();
      await leave();
    } catch {
      setConnectionError(
        "Não foi possível sair. Confira sua conexão e tente novamente.",
      );
    }
  }
  const setDirty = useCallback(
    (formId: string, value: boolean) => {
      store.setState((state) => {
        const dirtyForms = new Set(state.dirtyForms);
        if (value) dirtyForms.add(formId);
        else dirtyForms.delete(formId);
        return { ...state, dirtyForms };
      });
      channel.current?.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: store.state.dirtyForms.size > 0,
      });
    },
    [store],
  );
  const expire = useCallback(() => setStatus("expired"), [setStatus]);
  const reauthenticate = useCallback(async () => {
    queries.clear();
    await router.invalidate({ sync: true });
    setStatus("active");
  }, [queries, router, setStatus]);
  return {
    store,
    status,
    connectionError,
    logout,
    setDirty,
    expire,
    reauthenticate,
  };
}
