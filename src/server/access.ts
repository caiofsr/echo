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
  const credentials = personalCredentials(db);
  const auth = betterAuth({
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 15,
      maxPasswordLength: 1024,
    },
    session: {
      expiresIn: SESSION_SECONDS,
      updateAge: 0,
      cookieCache: { enabled: false },
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

  async function readSession(headers: Headers) {
    return auth.api.getSession({
      headers,
      query: { disableRefresh: true },
    });
  }
  function json(body: unknown, status = 200, headers?: HeadersInit) {
    const response = Response.json(body, { status, headers });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  async function handleAuth(request: Request) {
    const url = new URL(request.url);
    const method = request.method;
    const signIn =
      method === "POST" && url.pathname === "/api/auth/sign-in/email";
    const allowed =
      (method === "GET" && url.pathname === "/api/auth/get-session") ||
      signIn ||
      (method === "POST" && url.pathname === "/api/auth/sign-out");
    if (!allowed) return json({ message: "Não encontrado." }, 404);
    if (method === "POST" && request.headers.get("origin") !== origin)
      return json({ message: "Origem não permitida." }, 403);

    const response = await auth.handler(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return { handleAuth, readSession, setPassword: credentials.setPassword };
}
export type Access = ReturnType<typeof createAccess>;
