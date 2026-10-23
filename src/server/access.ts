import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { Database } from "./database";
import * as schema from "./schema";

const PERSONAL_EMAIL = "owner@echo.invalid";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function createAccess(
  db: Database,
  options: { baseURL: string; secret: string; secureCookies: boolean },
) {
  const auth = betterAuth({
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: 15,
    },
    session: {
      expiresIn: SESSION_SECONDS,
      updateAge: 0,
    },
    advanced: {
      // Better Auth otherwise skips Origin checks under NODE_ENV=test.
      disableOriginCheck: false,
      useSecureCookies: options.secureCookies,
      cookiePrefix: "echo",
      ipAddress: { ipAddressHeaders: ["x-echo-client-ip"] },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/get-session": false,
        "/sign-out": false,
      },
    },
    plugins: [tanstackStartCookies()],
  });

  async function setPassword(password: string) {
    // This instance is used only by the local administrative command. Its
    // bootstrap and reset APIs are never mounted as HTTP handlers.
    let token: string | undefined;
    const admin = betterAuth({
      ...auth.options,
      emailAndPassword: {
        ...auth.options.emailAndPassword,
        enabled: true,
        disableSignUp: false,
        autoSignIn: false,
        sendResetPassword: async (reset) => {
          token = reset.token;
        },
      },
    });
    await admin.api.requestPasswordReset({ body: { email: PERSONAL_EMAIL } });
    if (token) {
      await admin.api.resetPassword({ body: { token, newPassword: password } });
    } else {
      await admin.api.signUpEmail({
        body: { email: PERSONAL_EMAIL, name: "Echo", password },
      });
    }
  }

  return { auth, setPassword };
}
export type Access = ReturnType<typeof createAccess>;
