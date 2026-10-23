import type { BetterAuthOptions } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

// Shared with isolated test instances; contains no connection or secrets.
export const authOptions = {
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
    minPasswordLength: 15,
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 0,
  },
  advanced: {
    // Better Auth otherwise skips Origin checks under NODE_ENV=test.
    disableOriginCheck: false,
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
} satisfies BetterAuthOptions;
