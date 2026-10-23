import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getGlobalBroadcastChannel } from "better-auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { LoginForm } from "./login-form";

const SessionContext = createContext<{
  logout: () => Promise<void>;
  setDirty: (formId: string, dirty: boolean) => void;
  expire: () => void;
} | null>(null);
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession exige SessionBoundary.");
  return value;
}
// Future protected forms report unsaved work through setDirty. They remain
// mounted during reauthentication; only an explicit exit discards their state.
export function SessionBoundary({ children }: { children: ReactNode }) {
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
    window.location.replace("/login");
  }, [queries]);
  const check = useCallback(
    async (active = false) => {
      await refetch({ query: { disableRefresh: !active } });
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
        if (message.data?.trigger === "signout") leave();
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
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 60_000);
    if (status === "active") activity();
    else void check();
    return () => {
      window.removeEventListener("pagehide", pageHide);
      channel.current?.close();
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
      document.removeEventListener("scroll", activity);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", pageShow);
      clearInterval(interval);
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
      leave();
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
  return (
    <SessionContext.Provider value={{ logout, setDirty, expire }}>
      <div hidden={status !== "active"}>
        {connectionError && (
          <p role="alert" className="connection-error">
            {connectionError}
          </p>
        )}
        {children}
      </div>
      {status === "expired" && (
        <main className="reauth">
          <div className="brand">
            echo<span>.</span>
          </div>
          <LoginForm
            expired
            onSuccess={async () => {
              queries.clear();
              await router.invalidate();
              setStatus("active");
            }}
          />
        </main>
      )}
      {status === "checking" && (
        <main className="reauth">
          <p role="status">Conferindo acesso…</p>
        </main>
      )}
    </SessionContext.Provider>
  );
}
