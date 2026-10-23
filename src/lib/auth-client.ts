import { createAuthClient } from "better-auth/react";

export const ECHO_LOGIN_EMAIL = "owner@echo.invalid";
export const authClient = createAuthClient({
  sessionOptions: { refetchOnWindowFocus: false, refetchInterval: 0 },
  fetchOptions: { query: { disableRefresh: true } },
});
