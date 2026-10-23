import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:4318", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "bun scripts/e2e-server.ts",
    url: "http://localhost:4318/login",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "development",
      PORT: "4318",
      ECHO_TEST_CONTROL_PORT: "4319",
      BETTER_AUTH_URL: "http://localhost:4318",
      BETTER_AUTH_SECRET: "isolated-browser-test-secret-at-least-32-chars",
    },
  },
});
