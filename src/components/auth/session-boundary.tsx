import { type ReactNode } from "react";
import { SessionProvider } from "../../contexts/session";
import { LoginForm } from "./login-form";
import { useSessionLifecycle } from "../../hooks/use-session-lifecycle";

// Future protected forms report unsaved work through setDirty. They remain
// mounted during reauthentication; only an explicit exit discards their state.
export function SessionBoundary({ children }: { children: ReactNode }) {
  const lifecycle = useSessionLifecycle();
  const { status, connectionError, reauthenticate } = lifecycle;
  return (
    <SessionProvider
      value={{
        logout: lifecycle.logout,
        setDirty: lifecycle.setDirty,
      }}
    >
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
    </SessionProvider>
  );
}
