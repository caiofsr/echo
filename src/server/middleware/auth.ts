import { createMiddleware } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { auth } from "../../lib/auth";

export const requireSessionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Sessão inválida.");
  return next();
});
