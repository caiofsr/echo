import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { getAccess } from "./runtime";

export const hasSession = createServerFn({ method: "GET" }).handler(
  async () => {
    setResponseHeader("Cache-Control", "no-store");
    return Boolean(
      await getAccess().readSession(new Headers(getRequestHeaders())),
    );
  },
);
