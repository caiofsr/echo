import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { auth } from "../lib/auth";

export async function requireSession() {
  setResponseHeader("Cache-Control", "no-store");
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Sessão inválida.");
}
