import { type ReactNode } from "react";
import { createStoreContext } from "@tanstack/react-store";
import { LoginForm } from "./login-form";
import { useSessionLifecycle } from "./use-session-lifecycle";

const { StoreProvider, useStoreContext } =
  createStoreContext<
    Pick<
      ReturnType<typeof useSessionLifecycle>,
      "store" | "logout" | "setDirty" | "expire"
    >
  >();
export function useSession() {
  return useStoreContext();
}
// Future protected forms report unsaved work through setDirty. They remain
// mounted during reauthentication; only an explicit exit discards their state.
export function SessionBoundary({ children }: { children: ReactNode }) {
  const lifecycle = useSessionLifecycle();
  const { status, connectionError, reauthenticate } = lifecycle;
  return (
    <StoreProvider
      value={{
        store: lifecycle.store,
        logout: lifecycle.logout,
        setDirty: lifecycle.setDirty,
        expire: lifecycle.expire,
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
    </StoreProvider>
  );
}
