import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    {
      name: "echo-client-ip",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          request.headers["x-echo-client-ip"] = request.socket.remoteAddress;
          next();
        });
      },
    },
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: { port: 3000, host: "0.0.0.0" },
});
