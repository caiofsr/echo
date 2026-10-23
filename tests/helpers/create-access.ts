import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "../../src/db/connection";
import * as schema from "../../src/db/schema";
import { authOptions } from "../../src/config/auth";
import { setPassword } from "../../scripts/password";

export function createAccess(
  db: Database,
  options: { baseURL: string; secret: string },
) {
  const auth = betterAuth({
    ...authOptions,
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
  });
  return {
    auth,
    setPassword: (password: string) => setPassword(auth, password),
  };
}
