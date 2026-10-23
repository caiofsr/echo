import { APIError, createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";
import { atomicWrites, type Database } from "./database";
import * as schema from "./schema";

const OWNER = "echo-owner";
const EMAIL = "owner@echo.invalid";

// Echo's additional invariant: a login verified before a password reset must
// never leave a usable session after it. Native hooks cover HTTP and server reads.
export function personalCredentials(db: Database, origin: string) {
  const hooks = {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.request) {
        // Echo exposes only personal login, session observation and logout.
        if (!["/sign-in/email", "/get-session", "/sign-out"].includes(ctx.path))
          throw new APIError("NOT_FOUND", { message: "Não encontrado." });
        if (
          ctx.request.method === "POST" &&
          ctx.request.headers.get("origin") !== origin
        )
          throw new APIError("FORBIDDEN", { message: "Origem não permitida." });
      }
      if (ctx.path !== "/sign-in/email") return;
      if (ctx.body?.email !== undefined && ctx.body.email !== EMAIL)
        throw new APIError("UNAUTHORIZED", {
          message: "Senha incorreta. Confira e tente novamente.",
        });
      const [owner] = await db
        .select({ version: schema.user.credentialVersion })
        .from(schema.user)
        .where(eq(schema.user.id, OWNER));
      if (!owner)
        throw new APIError("UNAUTHORIZED", {
          message: "Senha incorreta. Confira e tente novamente.",
        });
      Object.assign(ctx.context, { echoCredentialVersion: owner.version });
    }),
    after: createAuthMiddleware(async (ctx) => {
      ctx.setHeader("Cache-Control", "no-store");
      if (ctx.path === "/get-session" && ctx.context.session) {
        const [valid] = await db
          .select({ id: schema.session.id })
          .from(schema.session)
          .innerJoin(schema.user, eq(schema.user.id, schema.session.userId))
          .where(
            and(
              eq(schema.session.id, ctx.context.session.session.id),
              eq(
                schema.session.credentialVersion,
                schema.user.credentialVersion,
              ),
            ),
          );
        if (!valid) {
          deleteSessionCookie(ctx);
          return ctx.json(null);
        }
      }
      if (ctx.path !== "/sign-in/email" || !ctx.context.newSession) return;
      const { token } = ctx.context.newSession.session;
      const { echoCredentialVersion: credentialVersion } = ctx.context as {
        echoCredentialVersion?: string;
      };
      const finalized = credentialVersion
        ? await db
            .update(schema.session)
            .set({ credentialVersion })
            .where(
              and(
                eq(schema.session.token, token),
                sql`exists (select 1 from user where id = ${OWNER} and credential_version = ${credentialVersion})`,
              ),
            )
            .returning({ id: schema.session.id })
        : [];
      if (!finalized.length) {
        await db.delete(schema.session).where(eq(schema.session.token, token));
        deleteSessionCookie(ctx);
        throw new APIError("UNAUTHORIZED", {
          message: "A senha foi redefinida. Entre novamente com a senha atual.",
        });
      }
    }),
  };
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
  return { hooks, setPassword };
}
