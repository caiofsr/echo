import type { ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";
import { buttonVariants } from "./button";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider timeout={5000} limit={3}>
      {children}
      <ToastList />
    </Toast.Provider>
  );
}
function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport className="toast-viewport" aria-label="Notificações">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="echo-toast"
            data-testid="toast"
          >
            <Toast.Content className="toast-content">
              <Toast.Title className="toast-title" />
              <Toast.Description className="toast-description" />
            </Toast.Content>
            <Toast.Close
              className={buttonVariants({ variant: "ghost" })}
              aria-label="Fechar notificação"
            >
              Fechar
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
