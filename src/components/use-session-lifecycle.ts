import { useCallback, useEffect, useRef, useState } from "react";
import { getGlobalBroadcastChannel } from "better-auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

// Native authentication is observed here. Echo owns visible activity, draft
// coordination and what happens when access expires or is explicitly ended.
export function useSessionLifecycle() {
  const [status, setStatus] = useState<"active" | "expired" | "checking">(
    "active",
  );
  const [connectionError, setConnectionError] = useState("");
  const session = authClient.useSession();
  const { refetch } = session;
  const dirtyForms = useRef(new Set<string>());
  const tabId = useRef("");
  const otherDirtyTabs = useRef(new Set<string>());
  const channel = useRef<BroadcastChannel | null>(null);
  const lastActivity = useRef(0);
  const router = useRouter();
  const queries = useQueryClient();
  const leave = useCallback(() => {
    dirtyForms.current.clear();
    queries.clear();
    setStatus("checking");
    return router.navigate({
      href: "/login",
      reloadDocument: true,
      replace: true,
    });
  }, [queries, router]);
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
      setStatus((current) => (current === "checking" ? "active" : current));
      setConnectionError("");
    }
  }, [session.data, session.isPending, session.isRefetching, session.error]);
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
        if (message.value) otherDirtyTabs.current.add(message.tab);
        else otherDirtyTabs.current.delete(message.tab);
      }
      if (message?.type === "hello")
        channel.current?.postMessage({
          type: "dirty",
          tab: tabId.current,
          value: dirtyForms.current.size > 0,
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
      otherDirtyTabs.current.clear();
      channel.current?.postMessage({ type: "hello" });
      channel.current?.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: dirtyForms.current.size > 0,
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
  }, []);
  useEffect(() => {
    const activity = () => {
      if (
        document.visibilityState !== "visible" ||
        Date.now() - lastActivity.current < 60_000 ||
        status !== "active"
      )
        return;
      lastActivity.current = Date.now();
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
  }, [check, status]);
  async function logout() {
    if (
      (dirtyForms.current.size > 0 || otherDirtyTabs.current.size > 0) &&
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
  const setDirty = useCallback((formId: string, value: boolean) => {
    if (value) dirtyForms.current.add(formId);
    else dirtyForms.current.delete(formId);
    channel.current?.postMessage({
      type: "dirty",
      tab: tabId.current,
      value: dirtyForms.current.size > 0,
    });
  }, []);
  const expire = useCallback(() => setStatus("expired"), []);
  const reauthenticate = useCallback(async () => {
    queries.clear();
    await router.invalidate({ sync: true });
    setStatus("active");
  }, [queries, router]);
  return { status, connectionError, logout, setDirty, expire, reauthenticate };
}
