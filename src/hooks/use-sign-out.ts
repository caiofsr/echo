import { useEffect, useEffectEvent } from "react";
import { getGlobalBroadcastChannel } from "better-auth/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { useDraftProtection } from "../contexts/draft-protection";

export function useSignOut() {
  const { confirmDiscard } = useDraftProtection();
  const queries = useQueryClient();
  const router = useRouter();
  function leave() {
    queries.clear();
    return router.navigate({
      to: "/login",
      search: { destination: "/" },
      replace: true,
    });
  }
  const mutation = useMutation({
    mutationFn: () => authClient.signOut({ fetchOptions: { throw: true } }),
    onSuccess: leave,
  });
  const leaveAfterRemoteSignOut = useEffectEvent(() => {
    void leave();
  });
  useEffect(
    () =>
      getGlobalBroadcastChannel().subscribe((message) => {
        // Explicit sign-out discards drafts; an expired session instead asks for reentry.
        if (message.data?.trigger === "signout") leaveAfterRemoteSignOut();
      }),
    [],
  );

  function signOut() {
    if (confirmDiscard()) mutation.mutate();
  }
  return { signOut, error: mutation.error };
}
