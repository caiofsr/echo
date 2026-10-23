import { useId, type RefCallback } from "react";
import { useSession } from "../contexts/session";

// Attach the returned ref to the form/root whose draft is being registered.
// React 19 calls its cleanup when that element detaches or the ref changes.
export function useUnsavedChanges(dirty: boolean): RefCallback<HTMLElement> {
  const formId = useId();
  const { setDirty } = useSession();
  return (element) => {
    if (!element) return;
    setDirty(formId, dirty);
    return () => setDirty(formId, false);
  };
}
