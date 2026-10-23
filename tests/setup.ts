// Eager application imports in SSR tests must never open the local app database.
process.env.DATABASE_URL = ":memory:";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET =
  "isolated-unit-test-secret-at-least-32-characters";
