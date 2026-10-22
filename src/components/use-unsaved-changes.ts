import { useEffect, useId } from "react";
import { useSession } from "./session-boundary";

// Protected forms use this hook; their values stay in component memory.
export function useUnsavedChanges(dirty: boolean) {
  const formId = useId();
  const { setDirty } = useSession();
  useEffect(() => {
    setDirty(formId, dirty);
    return () => setDirty(formId, false);
  }, [dirty, setDirty, formId]);
}
