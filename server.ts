import { join } from "node:path";

const entry = "./dist/server/server.js";
const { default: app } = await import(entry);
const assets = new Map<string, ReturnType<typeof Bun.file>>();
for await (const path of new Bun.Glob("**/*").scan({
  cwd: "dist/client",
  onlyFiles: true,
})) {
  assets.set(`/${path}`, Bun.file(join("dist/client", path)));
}
const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: "0.0.0.0",
  maxRequestBodySize: 16 * 1024,
  async fetch(request, server) {
    const path = new URL(request.url).pathname;
    const asset = assets.get(path);
    if (asset && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : asset, {
        headers: {
          "Content-Type": asset.type,
          "Cache-Control": path.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const headers = new Headers(request.headers);
    // Never accept an IP identity supplied by the browser or an arbitrary proxy.
    headers.set(
      "x-echo-client-ip",
      server.requestIP(request)?.address ?? "unknown",
    );
    const response: Response = await app.fetch(
      new Request(request, { headers }),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "same-origin");
    return response;
  },
});
console.log(`Echo disponível na porta ${server.port}.`);
