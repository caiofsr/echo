import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hashPassword } from "better-auth/crypto";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq, sql } from "drizzle-orm";
import { atomicWrites, type Database } from "./database";
import * as schema from "./schema";

const OWNER = "echo-owner";
const EMAIL = "owner@echo.invalid";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export function createAccess(
  db: Database,
  options: { baseURL: string; secret: string; secureCookies: boolean },
) {
  const origin = new URL(options.baseURL).origin;
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
    plugins: [tanstackStartCookies()],
  });

  async function readSession(headers: Headers) {
    const current = await auth.api.getSession({
      headers,
      query: { disableRefresh: true },
    });
    if (!current) return null;
    const [valid] = await db
      .select({ id: schema.session.id })
      .from(schema.session)
      .innerJoin(schema.user, eq(schema.user.id, schema.session.userId))
      .where(
        and(
          eq(schema.session.id, current.session.id),
          eq(schema.session.credentialVersion, schema.user.credentialVersion),
        ),
      );
    return valid ? current : null;
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

    let owner: { version: string } | undefined;
    if (signIn) {
      let body: unknown;
      try {
        if (
          (request.headers.get("content-type") ?? "").split(";")[0] !==
          "application/json"
        )
          return json({ message: "Envie a senha em JSON." }, 415);
        const text = await request.clone().text();
        if (text.length > 8192)
          return json({ message: "Senha inválida." }, 400);
        body = JSON.parse(text);
      } catch {
        return json({ message: "Informe sua senha." }, 400);
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("email" in body) ||
        body.email !== EMAIL ||
        !("password" in body) ||
        typeof body.password !== "string" ||
        !body.password ||
        body.password.length > 1024
      )
        return json(
          { message: "Senha incorreta. Confira e tente novamente." },
          401,
        );
      [owner] = await db
        .select({ version: schema.user.credentialVersion })
        .from(schema.user)
        .where(eq(schema.user.id, OWNER));
      if (!owner)
        return json(
          { message: "Senha incorreta. Confira e tente novamente." },
          401,
        );
    }

    const response = await auth.handler(request);
    if (signIn && response.ok && owner) {
      const { token } = await response.clone().json();
      // A session is unusable until its credential revision is confirmed in
      // SQLite. A concurrent password reset either prevents this update or
      // deletes the finalized session in the same transaction as the reset.
      const finalized = await db
        .update(schema.session)
        .set({ credentialVersion: owner.version })
        .where(
          and(
            eq(schema.session.token, token),
            sql`exists (select 1 from user where id = ${OWNER} and credential_version = ${owner.version})`,
          ),
        )
        .returning({ id: schema.session.id });
      if (!finalized.length) {
        await db.delete(schema.session).where(eq(schema.session.token, token));
        return json(
          {
            message:
              "A senha foi redefinida. Entre novamente com a senha atual.",
          },
          401,
        );
      }
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  async function setPassword(password: string) {
    if (password.length < 15 || password.length > 1024)
      throw new Error("A senha deve ter entre 15 e 1024 caracteres.");
    const hashed = await hashPassword(password);
    const now = new Date();
    const credentialVersion = crypto.randomUUID();
    await atomicWrites(db, (tx) => [
      tx
        .insert(schema.user)
        .values({
          id: OWNER,
          credentialVersion,
          name: "Echo",
          email: EMAIL,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.user.id,
          set: { credentialVersion, updatedAt: now },
        }),
      tx
        .insert(schema.account)
        .values({
          id: OWNER,
          accountId: OWNER,
          providerId: "credential",
          userId: OWNER,
          password: hashed,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.account.id,
          set: { password: hashed, updatedAt: now },
        }),
      tx.delete(schema.session).where(eq(schema.session.userId, OWNER)),
    ]);
  }
  return { handleAuth, readSession, setPassword };
}
export type Access = ReturnType<typeof createAccess>;
