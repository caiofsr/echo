import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { getAuth } from "./runtime";

export const hasSession = createServerFn({ method: "GET" }).handler(
  async () => {
    setResponseHeader("Cache-Control", "no-store");
    return Boolean(
      await getAuth().api.getSession({
        headers: getRequestHeaders(),
        query: { disableRefresh: true },
      }),
    );
  },
);
