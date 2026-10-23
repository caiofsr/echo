import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { auth } from "../../lib/auth";

export const hasSession = createServerFn({ method: "GET" }).handler(
  async () => {
    setResponseHeader("Cache-Control", "no-store");
    return Boolean(
      await auth.api.getSession({
        headers: getRequestHeaders(),
        query: { disableRefresh: true },
      }),
    );
  },
);
