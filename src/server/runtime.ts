import { env } from "node:process";
import { mkdirSync } from "node:fs";
import { openDatabase } from "./database";
import { createAccess } from "./access";

export function readEnvironment() {
  const production = env.NODE_ENV === "production";
  const baseURL =
    env.BETTER_AUTH_URL ?? (production ? "" : "http://localhost:3000");
  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (secret.length < 32)
    throw new Error("Defina BETTER_AUTH_SECRET com pelo menos 32 caracteres.");
  const parsed = new URL(baseURL);
  if (production && parsed.protocol !== "https:")
    throw new Error("BETTER_AUTH_URL deve usar HTTPS em produção.");
  const url = env.DATABASE_URL ?? "file:.data/echo.db";
  if (url.startsWith("file:")) mkdirSync(".data", { recursive: true });
  return {
    url,
    baseURL,
    secret,
    secureCookies: production,
  };
}
let access: ReturnType<typeof createAccess> | undefined;
export function getAccess() {
  if (!access) {
    const env = readEnvironment();
    const { db } = openDatabase(env.url);
    access = createAccess(db, env);
  }
  return access;
}
