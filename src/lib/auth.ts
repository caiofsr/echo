import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { authOptions } from "../config/auth";
import { readEnvironment } from "../config/env";

const env = readEnvironment();
export const auth = betterAuth({
  ...authOptions,
  baseURL: env.baseURL,
  secret: env.secret,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
});
