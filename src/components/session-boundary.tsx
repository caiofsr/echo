import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
    window.location.replace("/entrar");
  }, [queries]);
  const check = useCallback(async (active = false) => {
    try {
      const response = await fetch(
        `/api/access/${active ? "activity" : "session"}`,
        active ? { method: "POST" } : {},
      );
      if (response.status === 401) {
        setStatus("expired");
        return;
      }
      if (response.ok) {
        setStatus((current) => (current === "checking" ? "active" : current));
        setConnectionError("");
      }
    } catch {
      /* Connectivity does not imply expiry or discard in-memory work. */
    }
  }, []);
  useEffect(() => {
    channel.current = new BroadcastChannel("echo-session");
    tabId.current ||= crypto.randomUUID();
    channel.current.onmessage = (event) => {
      const message = event.data;
      if (message === "logout") {
        leave();
        return;
      }
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
  }, [check, leave, status]);
  async function logout() {
    if (
      (dirtyForms.current.size > 0 || otherDirtyTabs.current.size > 0) &&
      !window.confirm(
        "Sair e descartar as alterações não salvas em todas as abas deste navegador?",
      )
    )
      return;
    try {
      const response = await fetch("/api/access/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error();
      channel.current?.postMessage("logout");
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
