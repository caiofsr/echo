import { type ReactNode } from "react";
import { DraftProtectionProvider } from "../../contexts/draft-protection";
import { useUnsavedDrafts } from "../../hooks/use-unsaved-drafts";
import { useReauthentication } from "../../hooks/use-reauthentication";
import { LoginForm } from "./login-form";

// Keep forms mounted until reentry completes. Explicit sign-out unmounts them.
export function ReauthenticationBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const drafts = useUnsavedDrafts();
  const { reauthenticationRequired, restoring, resumeAfterLogin } =
    useReauthentication();
  return (
    <DraftProtectionProvider value={drafts}>
      <div hidden={reauthenticationRequired || restoring}>{children}</div>
      {reauthenticationRequired && !restoring && (
        <main className="reauth">
          <div className="brand">
            echo<span>.</span>
          </div>
          <LoginForm expired onSuccess={resumeAfterLogin} />
        </main>
      )}
      {restoring && (
        <main className="reauth">
          <p role="status">Conferindo acesso…</p>
        </main>
      )}
    </DraftProtectionProvider>
  );
}
