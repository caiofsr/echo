import { useEffect, useRef } from "react";
import { useCreateStore } from "@tanstack/react-store";

// The channel carries only draft presence. Better Auth owns session messages.
export function useUnsavedDrafts() {
  const store = useCreateStore({
    dirtyForms: new Set<string>(),
    otherDirtyTabs: new Set<string>(),
  });
  const channel = useRef<BroadcastChannel | null>(null);
  const tabId = useRef("");

  useEffect(() => {
    const messages = new BroadcastChannel("echo-drafts");
    channel.current = messages;
    if (!tabId.current) tabId.current = crypto.randomUUID();
    const announce = () =>
      messages.postMessage({
        type: "dirty",
        tab: tabId.current,
        value: store.state.dirtyForms.size > 0,
      });
    const leave = () =>
      messages.postMessage({ type: "dirty", tab: tabId.current, value: false });
    const restore = () => {
      store.setState((state) => ({
        ...state,
        otherDirtyTabs: new Set<string>(),
      }));
      messages.postMessage({ type: "hello" });
      announce();
    };
    messages.onmessage = ({ data: message }) => {
      if (message?.type === "dirty" && typeof message.tab === "string") {
        store.setState((state) => {
          const otherDirtyTabs = new Set(state.otherDirtyTabs);
          if (message.value) otherDirtyTabs.add(message.tab);
          else otherDirtyTabs.delete(message.tab);
          return { ...state, otherDirtyTabs };
        });
      }
      if (message?.type === "hello") announce();
    };
    restore();
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    return () => {
      leave();
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restore);
      messages.close();
      channel.current = null;
    };
  }, [store]);

  function setDraftDirty(formId: string, dirty: boolean) {
    store.setState((state) => {
      const dirtyForms = new Set(state.dirtyForms);
      if (dirty) dirtyForms.add(formId);
      else dirtyForms.delete(formId);
      return { ...state, dirtyForms };
    });
    channel.current?.postMessage({
      type: "dirty",
      tab: tabId.current,
      value: store.state.dirtyForms.size > 0,
    });
  }
  function confirmDiscard() {
    return (
      (store.state.dirtyForms.size === 0 &&
        store.state.otherDirtyTabs.size === 0) ||
      window.confirm(
        "Sair e descartar as alterações não salvas em todas as abas deste navegador?",
      )
    );
  }
  return { setDraftDirty, confirmDiscard };
}
