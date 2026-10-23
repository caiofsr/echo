import { createAuthClient } from "better-auth/react";

export const ECHO_LOGIN_EMAIL = "owner@echo.invalid";
export const authClient = createAuthClient({
  sessionOptions: { refetchOnWindowFocus: false, refetchInterval: 0 },
  fetchOptions: {
    onRequest(context) {
      const url = new URL(context.url, window.location.origin);
      // Native session subscriptions (mount, reconnect and cross-tab updates)
      // only observe. Echo explicitly renews on activity in a visible tab.
      if (
        url.pathname === "/api/auth/get-session" &&
        context.method === "GET"
      ) {
        if (!url.searchParams.has("disableRefresh"))
          url.searchParams.set("disableRefresh", "true");
        context.url = url;
      }
    },
  },
});
