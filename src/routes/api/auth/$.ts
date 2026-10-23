import { createFileRoute } from "@tanstack/react-router";
import { getAccess } from "../../../server/runtime";

async function handle({ request }: { request: Request }) {
  return getAccess().handleAuth(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
