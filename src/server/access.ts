import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { Database } from "./database";
import { personalCredentials } from "./personal-credentials";
import * as schema from "./schema";

const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function createAccess(
  db: Database,
  options: { baseURL: string; secret: string; secureCookies: boolean },
) {
  const origin = new URL(options.baseURL).origin;
  const credentials = personalCredentials(db, origin);
  const auth = betterAuth({
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 15,
    },
    session: {
      expiresIn: SESSION_SECONDS,
      updateAge: 0,
    },
    advanced: {
      useSecureCookies: options.secureCookies,
      cookiePrefix: "echo",
      ipAddress: { ipAddressHeaders: ["x-echo-client-ip"] },
    },
    trustedOrigins: [origin],
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/get-session": false,
        "/sign-out": false,
      },
    },
    hooks: credentials.hooks,
    plugins: [tanstackStartCookies()],
  });

  return { auth, setPassword: credentials.setPassword };
}
export type Access = ReturnType<typeof createAccess>;
