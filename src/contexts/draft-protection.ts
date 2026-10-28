import { createStoreContext } from "@tanstack/react-store";

export const {
  StoreProvider: DraftProtectionProvider,
  useStoreContext: useDraftProtection,
} = createStoreContext<{
  setDraftDirty: (formId: string, dirty: boolean) => void;
  confirmDiscard: () => boolean;
}>();
