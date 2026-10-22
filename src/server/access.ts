import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./database";
import * as schema from "./schema";

const OWNER = "echo-owner";
const EMAIL = "owner@echo.invalid";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const ATTEMPT_WINDOW = 60_000;

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
    advanced: { useSecureCookies: options.secureCookies, cookiePrefix: "echo" },
    trustedOrigins: [origin],
    rateLimit: { enabled: false },
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
  function cookies(response: Response) {
    const headers = new Headers();
    for (const cookie of response.headers.getSetCookie())
      headers.append("set-cookie", cookie);
    return headers;
  }

  async function handle(request: Request, clientAddress: string) {
    const action = new URL(request.url).pathname.split("/").at(-1);
    const method = request.method;
    if (method === "GET" && action === "session") {
      const current = await readSession(request.headers);
      return current
        ? json({ authenticated: true, expiresAt: current.session.expiresAt })
        : json({ message: "Entre para continuar." }, 401);
    }
    if (
      method !== "POST" ||
      !["login", "logout", "activity"].includes(action ?? "")
    )
      return json({ message: "Não encontrado." }, 404);
    if (request.headers.get("origin") !== origin)
      return json({ message: "Origem não permitida." }, 403);

    if (action === "login") {
      const now = Date.now();
      const [attempt] = await db
        .insert(schema.loginAttempt)
        .values({ origin: clientAddress, startedAt: now, count: 1 })
        .onConflictDoUpdate({
          target: schema.loginAttempt.origin,
          set: {
            startedAt: sql`CASE WHEN ${schema.loginAttempt.startedAt} <= ${now - ATTEMPT_WINDOW} THEN ${now} ELSE ${schema.loginAttempt.startedAt} END`,
            count: sql`CASE WHEN ${schema.loginAttempt.startedAt} <= ${now - ATTEMPT_WINDOW} THEN 1 ELSE ${schema.loginAttempt.count} + 1 END`,
          },
        })
        .returning();
      if (attempt.count > 5) {
        const retryAfter = Math.max(
          1,
          Math.ceil((attempt.startedAt + ATTEMPT_WINDOW - now) / 1000),
        );
        return json(
          {
            message: `Muitas tentativas. Tente novamente em ${retryAfter} segundos.`,
            retryAfter,
          },
          429,
          { "Retry-After": String(retryAfter) },
        );
      }
      let password: unknown;
      try {
        if (
          (request.headers.get("content-type") ?? "").split(";")[0] !==
          "application/json"
        )
          return json({ message: "Envie a senha em JSON." }, 415);
        const text = await request.text();
        if (text.length > 8192)
          return json({ message: "Senha inválida." }, 400);
        password = JSON.parse(text).password;
      } catch {
        return json({ message: "Informe sua senha." }, 400);
      }
      if (typeof password !== "string" || !password || password.length > 1024)
        return json({ message: "Informe uma senha válida." }, 400);
      const [owner] = await db
        .select({ version: schema.user.credentialVersion })
        .from(schema.user)
        .where(eq(schema.user.id, OWNER));
      if (!owner)
        return json(
          { message: "Senha incorreta. Confira e tente novamente." },
          401,
        );
      const result = await auth.api.signInEmail({
        body: { email: EMAIL, password, rememberMe: true },
        headers: request.headers,
        asResponse: true,
      });
      if (!result.ok)
        return json(
          { message: "Senha incorreta. Confira e tente novamente." },
          401,
        );
      const { token } = await result.json();
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
      await db
        .delete(schema.loginAttempt)
        .where(eq(schema.loginAttempt.origin, clientAddress));
      return json({ authenticated: true }, 200, cookies(result));
    }
    const current = await readSession(request.headers);
    if (!current)
      return json(
        { message: "Sua sessão expirou. Entre novamente para continuar." },
        401,
      );
    if (action === "logout") {
      const result = await auth.api.signOut({
        headers: request.headers,
        asResponse: true,
      });
      return json({ authenticated: false }, result.status, cookies(result));
    }
    const result = await auth.api.getSession({
      headers: request.headers,
      query: { disableRefresh: false },
      asResponse: true,
    });
    const renewed = await result.json();
    if (!renewed)
      return json(
        { message: "Sua sessão expirou. Entre novamente." },
        401,
        cookies(result),
      );
    return json(
      { authenticated: true, expiresAt: renewed.session.expiresAt },
      200,
      cookies(result),
    );
  }

  async function setPassword(password: string) {
    if (password.length < 15 || password.length > 1024)
      throw new Error("A senha deve ter entre 15 e 1024 caracteres.");
    const hashed = await hashPassword(password);
    const now = new Date();
    const credentialVersion = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx
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
        });
      await tx
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
        });
      await tx.delete(schema.session).where(eq(schema.session.userId, OWNER));
    });
  }
  return { handle, readSession, setPassword };
}
export type Access = ReturnType<typeof createAccess>;
