import { env } from "node:process";

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
  return {
    baseURL,
    secret,
  };
}
