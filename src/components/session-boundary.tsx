import { createContext, useContext, type ReactNode } from "react";
import { LoginForm } from "./login-form";
import { useSessionLifecycle } from "./use-session-lifecycle";

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
  const { status, connectionError, logout, setDirty, expire, reauthenticate } =
    useSessionLifecycle();
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
          <LoginForm expired onSuccess={reauthenticate} />
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
