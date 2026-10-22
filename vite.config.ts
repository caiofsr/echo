import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), tanstackStart(), react()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: { port: 3000, host: "0.0.0.0" },
});
