import { useEffect, useEffectEvent, useRef } from "react";
import { getGlobalBroadcastChannel } from "better-auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCreateStore, useSelector } from "@tanstack/react-store";
import { authClient } from "../lib/auth-client";

// Better Auth owns authentication. Echo owns the latched reentry screen,
// visible activity and draft coordination while that screen is open.
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
  const { data, isPending, isRefetching, error, refetch } =
    authClient.useSession();
  const tabId = useRef("");
  const channel = useRef<BroadcastChannel | null>(null);
  const router = useRouter();
  const queries = useQueryClient();

  function setStatus(status: "active" | "expired" | "checking") {
    store.setState((state) => ({ ...state, status }));
  }
  function leave() {
    store.setState((state) => ({
      ...state,
      dirtyForms: new Set<string>(),
      status: "checking",
    }));
    queries.clear();
    return router.navigate({
      href: "/login",
      reloadDocument: true,
      replace: true,
    });
  }
  function check(active = false) {
    // Omit the native flag for renewal: its HTTP schema coerces "false" to true.
    return refetch({ query: { disableRefresh: active ? undefined : true } });
  }

  // Expiry stays latched until Echo has invalidated the routes after reentry.
  // A native session update alone must not reveal a preserved stale form.
  useEffect(() => {
    if (isPending || isRefetching || error) return;
    store.setState((state) =>
      !data
        ? { ...state, status: "expired" }
        : {
            ...state,
            status: state.status === "checking" ? "active" : state.status,
            connectionError: "",
          },
    );
  }, [data, isPending, isRefetching, error, store]);

  const onSignOut = useEffectEvent(() => {
    void leave();
  });
  const onActivity = useEffectEvent(() => {
    if (
      document.visibilityState !== "visible" ||
      status !== "active" ||
      Date.now() - store.state.lastActivity < 60_000
    )
      return;
    store.setState((state) => ({ ...state, lastActivity: Date.now() }));
    void check(true);
  });
  const onRestore = useEffectEvent((event: PageTransitionEvent) => {
    if (event.persisted) {
      setStatus("checking");
      void check();
    }
  });

  // These subscriptions share the boundary's lifetime. Effect Events read the
  // latest committed UI state without reconnecting on each session change.
  useEffect(() => {
    const messages = new BroadcastChannel("echo-session");
    channel.current = messages;
    if (!tabId.current) tabId.current = crypto.randomUUID();
    const announce = () =>
      messages.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: store.state.dirtyForms.size > 0,
      });
    const pageHide = () =>
      messages.postMessage({ type: "dirty", tab: tabId.current, value: false });
    messages.onmessage = (event) => {
      const message = event.data;
      if (message?.type === "dirty" && typeof message.tab === "string") {
        store.setState((state) => {
          const otherDirtyTabs = new Set(state.otherDirtyTabs);
          if (message.value) otherDirtyTabs.add(message.tab);
          else otherDirtyTabs.delete(message.tab);
          return { ...state, otherDirtyTabs };
        });
      }
      if (message?.type === "hello") announce();
    };
    messages.postMessage({ type: "hello" });
    announce();
    const unsubscribe = getGlobalBroadcastChannel().subscribe((message) => {
      if (message.data?.trigger === "signout") onSignOut();
    });
    const pageShow = (event: PageTransitionEvent) => {
      store.setState((state) => ({
        ...state,
        otherDirtyTabs: new Set<string>(),
      }));
      messages.postMessage({ type: "hello" });
      announce();
      onRestore(event);
    };
    const visibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };
    document.addEventListener("pointerdown", onActivity);
    document.addEventListener("keydown", onActivity);
    document.addEventListener("scroll", onActivity, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", pageShow);
    onActivity();
    return () => {
      pageHide();
      unsubscribe();
      document.removeEventListener("pointerdown", onActivity);
      document.removeEventListener("keydown", onActivity);
      document.removeEventListener("scroll", onActivity);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", pageShow);
      messages.close();
      channel.current = null;
    };
  }, [store]);

  async function logout() {
    if (
      (store.state.dirtyForms.size > 0 ||
        store.state.otherDirtyTabs.size > 0) &&
      !window.confirm(
        "Sair e descartar as alterações não salvas em todas as abas deste navegador?",
      )
    )
      return;
    function reportConnectionError() {
      store.setState((state) => ({
        ...state,
        connectionError:
          "Não foi possível sair. Confira sua conexão e tente novamente.",
      }));
    }
    const result = await authClient.signOut().catch(() => null);
    if (!result || (result.error && result.error.status !== 401)) {
      reportConnectionError();
      return;
    }
    await leave().catch(reportConnectionError);
  }

  function setDirty(formId: string, value: boolean) {
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
  }
  async function reauthenticate() {
    queries.clear();
    await router.invalidate({ sync: true });
    setStatus("active");
  }
  return { status, connectionError, logout, setDirty, reauthenticate };
}
