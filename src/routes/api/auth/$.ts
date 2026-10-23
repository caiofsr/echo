import { createFileRoute } from "@tanstack/react-router";
import { getAccess } from "../../../server/runtime";

async function handle({ request }: { request: Request }) {
  // Production server overwrites this header with the peer address. Vite uses
  // one shared development bucket and never trusts a caller-supplied address.
  const address =
    process.env.NODE_ENV === "production"
      ? (request.headers.get("x-echo-client-ip") ?? "unknown")
      : "127.0.0.1";
  return getAccess().handleAuth(request, address);
}

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
