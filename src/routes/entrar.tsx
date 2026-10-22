import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasSession } from "../server/session";
import { LoginForm } from "../components/login-form";
const destinations = [
  "/",
  "/horas",
  "/faturas",
  "/cadastros",
  "/configuracoes",
];
function safeDestination(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/";
  const url = new URL(value, "https://echo.invalid");
  return url.origin === "https://echo.invalid" &&
    destinations.includes(url.pathname)
    ? `${url.pathname}${url.search}${url.hash}`
    : "/";
}
export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: safeDestination(search.destino),
  }),
  beforeLoad: async ({ search }) => {
    if (await hasSession()) throw redirect({ href: search.destino });
  },
  component: LoginPage,
});
function LoginPage() {
  const { destino } = Route.useSearch();
  return (
    <main className="login-page">
      <div className="login-brand brand">
        echo<span>.</span>
      </div>
      <LoginForm
        onSuccess={() => {
          window.location.assign(destino);
        }}
      />
      <footer className="login-footer">
        Seu espaço pessoal de trabalho freelancer.
      </footer>
    </main>
  );
}
