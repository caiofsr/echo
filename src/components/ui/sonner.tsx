import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Generated with shadcn add sonner; uses Echo's fixed dark theme and tokens.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    position="bottom-right"
    closeButton
    visibleToasts={3}
    duration={5000}
    containerAriaLabel="Notificações"
    icons={{
      success: null,
      info: null,
      warning: null,
      error: null,
      loading: null,
    }}
    style={
      {
        "--normal-bg": "var(--surface)",
        "--normal-text": "var(--foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "12px",
      } as CSSProperties
    }
    toastOptions={{
      closeButtonAriaLabel: "Fechar notificação",
      classNames: {
        toast: "echo-toast",
        title: "toast-title",
        description: "toast-description",
        content: "toast-content",
        closeButton: "toast-close",
      },
    }}
    {...props}
  />
);
export { Toaster };
