import { betterAuth, type BetterAuthOptions } from "better-auth";

const PERSONAL_EMAIL = "owner@echo.invalid";

export async function setPassword(
  auth: { options: BetterAuthOptions },
  password: string,
) {
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
