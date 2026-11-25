import { defineConfig, devices } from "@playwright/test";

const browserPort = process.env.ECHO_BROWSER_PORT ?? "4318";
const controlPort = process.env.ECHO_TEST_CONTROL_PORT ?? "4319";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${browserPort}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "bun scripts/e2e-server.ts",
    url: `http://localhost:${browserPort}/login`,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "development",
      PORT: browserPort,
      ECHO_TEST_CONTROL_PORT: controlPort,
      BETTER_AUTH_URL: `http://localhost:${browserPort}`,
      BETTER_AUTH_SECRET: "isolated-browser-test-secret-at-least-32-chars",
    },
  },
});
