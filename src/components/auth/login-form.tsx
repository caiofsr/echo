import { useCreateStore, useSelector } from "@tanstack/react-store";
import { useForm } from "@tanstack/react-form";
import { authClient, ECHO_LOGIN_EMAIL } from "../../lib/auth-client";
import { EchoIcon } from "../ui/icons";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function LoginForm({
  onSuccess,
  expired = false,
}: {
  onSuccess: () => void | Promise<void>;
  expired?: boolean;
}) {
  const store = useCreateStore({ visible: false });
  const visible = useSelector(store, (state) => state.visible);
  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      let retryAfter: string | null = null;
      const result = await authClient.signIn
        .email(
          { email: ECHO_LOGIN_EMAIL, password: value.password },
          {
            onError: ({ response }) => {
              retryAfter = response.headers.get("X-Retry-After");
            },
          },
        )
        .catch(() => null);
      if (!result) {
        setError(
          "Não foi possível conectar. Confira sua conexão e tente novamente.",
        );
        return;
      }
      if (result.error) {
        setError(
          result.error.status === 429
            ? retryAfter
              ? `Muitas tentativas. Tente novamente em ${retryAfter} segundos.`
              : "Muitas tentativas. Tente novamente em breve."
            : "Senha incorreta. Confira e tente novamente.",
        );
        return;
      }
      form.reset();
      try {
        await onSuccess();
      } catch {
        setError(
          "Não foi possível conectar. Confira sua conexão e tente novamente.",
        );
      }
    },
  });
  const error = useSelector(form.store, (state) => state.errors.join(" "));
  const setError = (message: string) =>
    form.setErrorMap({ onSubmit: { form: message, fields: {} } });
  return (
    <div className="login-content">
      <h1>{expired ? "Entre novamente" : "Seu trabalho, no seu ritmo."}</h1>
      <p className="login-description">
        {expired
          ? "Sua sessão expirou. O que você estava editando continua nesta aba enquanto ela permanecer aberta."
          : "Entre com sua senha para acessar o Echo."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          form.setErrorMap({ onSubmit: undefined });
          void form.handleSubmit();
        }}
      >
        <form.Field name="password">
          {(field) => (
            <div className="field">
              <label htmlFor="password">Senha pessoal</label>
              <div className="password-field">
                <Input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  required
                  maxLength={1024}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="password-toggle"
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={visible}
                  onClick={() =>
                    store.setState((state) => ({
                      ...state,
                      visible: !state.visible,
                    }))
                  }
                >
                  <EchoIcon name={visible ? "hide" : "show"} size={18} />
                </Button>
              </div>
            </div>
          )}
        </form.Field>
        {error && (
          <p id="login-error" className="error-message" role="alert">
            {error}
          </p>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button type="submit" className="login-submit" disabled={pending}>
              {pending ? (
                <>
                  <EchoIcon name="loading" className="spin" size={18} />{" "}
                  Entrando…
                </>
              ) : (
                <>
                  Entrar <EchoIcon name="login" size={18} />
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
      {!expired && (
        <p className="login-footnote">
          Esqueceu a senha? Redefina pelo servidor do Echo.
        </p>
      )}
    </div>
  );
}
