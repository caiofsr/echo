import { APIError, createAuthMiddleware } from "better-auth/api";

export const PERSONAL_EMAIL = "owner@echo.invalid";

// Only Echo's HTTP surface and personal identity need application hooks.
export const personalAccessHooks = {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.request) {
      if (!["/sign-in/email", "/get-session", "/sign-out"].includes(ctx.path))
        throw new APIError("NOT_FOUND", { message: "Não encontrado." });
      // Native origin validation allows Referer/inference; Echo requires Origin.
      const origin = ctx.request.headers.get("origin");
      if (ctx.request.method === "POST" && (!origin || origin === "null"))
        throw new APIError("FORBIDDEN", { message: "Origem não permitida." });
    }
    if (
      ctx.path === "/sign-in/email" &&
      ctx.body?.email !== undefined &&
      ctx.body.email !== PERSONAL_EMAIL
    )
      throw new APIError("UNAUTHORIZED", {
        message: "Senha incorreta. Confira e tente novamente.",
      });
  }),
  after: createAuthMiddleware(async (ctx) => {
    ctx.setHeader("Cache-Control", "no-store");
  }),
};
