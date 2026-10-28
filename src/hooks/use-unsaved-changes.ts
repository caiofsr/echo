import { useId, type RefCallback } from "react";
import { useDraftProtection } from "../contexts/draft-protection";

// Attach the returned ref to the form/root whose draft is being registered.
// React 19 calls its cleanup when that element detaches or the ref changes.
export function useUnsavedChanges(dirty: boolean): RefCallback<HTMLElement> {
  const formId = useId();
  const { setDraftDirty } = useDraftProtection();
  return (element) => {
    if (!element) return;
    setDraftDirty(formId, dirty);
    return () => setDraftDirty(formId, false);
  };
}
