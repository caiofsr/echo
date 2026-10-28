import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { accessQueryOptions } from "../queries/access";
import { LoginForm } from "../components/auth/login-form";

const destinations = ["/", "/hours", "/invoices", "/directory", "/settings"];
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
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    destination: safeDestination(search.destination),
  }),
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.fetchQuery(accessQueryOptions))
      throw redirect({ href: search.destination });
  },
  component: LoginPage,
});
function LoginPage() {
  const router = useRouter();
  const queries = useQueryClient();
  return (
    <main className="login-page">
      <div className="login-brand brand">
        echo<span>.</span>
      </div>
      <LoginForm
        onSuccess={async () => {
          await queries.invalidateQueries({
            queryKey: accessQueryOptions.queryKey,
          });
          await router.invalidate({ sync: true });
        }}
      />
      <footer className="login-footer">
        Seu espaço pessoal de trabalho freelancer.
      </footer>
    </main>
  );
}
