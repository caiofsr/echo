import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

export const companySettings = sqliteTable("company_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  taxId: text("tax_id"),
  address: text("address"),
  phone: text("phone"),
});

export const paymentMethod = sqliteTable("payment_method", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  instructions: text("instructions").notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const client = sqliteTable("client", {
  version: integer("version").notNull().default(1),
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  taxId: text("tax_id"),
  address: text("address"),
});

export const project = sqliteTable(
  "project",
  {
    version: integer("version").notNull().default(1),
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => client.id),
    hourlyRateCents: integer("hourly_rate_cents").notNull(),
    currency: text("currency", { enum: ["BRL", "USD"] }).notNull(),
  },
  (table) => [index("project_client_id_idx").on(table.clientId)],
);

export const boardColumn = sqliteTable(
  "board_column",
  {
    version: integer("version").notNull().default(1),
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [unique("board_column_position_unique").on(table.position)],
);

export const boardTask = sqliteTable(
  "board_task",
  {
    version: integer("version").notNull().default(1),
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    projectId: integer("project_id").references(() => project.id),
    columnId: integer("column_id")
      .notNull()
      .references(() => boardColumn.id),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("board_task_column_position_unique").on(
      table.columnId,
      table.position,
    ),
    index("board_task_project_id_idx").on(table.projectId),
  ],
);

export const timerPreferences = sqliteTable(
  "timer_preferences",
  {
    id: integer("id").primaryKey(),
    hourlyRateCents: integer("hourly_rate_cents").notNull().default(0),
    currency: text("currency", { enum: ["BRL", "USD"] })
      .notNull()
      .default("BRL"),
    timezone: text("timezone").notNull().default("America/Recife"),
  },
  (table) => [
    check("timer_preferences_singleton", sql`${table.id} = 1`),
    check("timer_preferences_rate", sql`${table.hourlyRateCents} >= 0`),
    check(
      "timer_preferences_currency",
      sql`${table.currency} IN ('BRL', 'USD')`,
    ),
  ],
);
export const timerState = sqliteTable(
  "timer_state",
  {
    id: integer("id").primaryKey(),
    version: integer("version").notNull().default(0),
  },
  (table) => [check("timer_state_singleton", sql`${table.id} = 1`)],
);
export const timeRecord = sqliteTable(
  "time_record",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    hourlyRateCents: integer("hourly_rate_cents").notNull(),
    currency: text("currency", { enum: ["BRL", "USD"] }).notNull(),
  },
  (table) => [
    uniqueIndex("time_record_single_active")
      .on(sql`(1)`)
      .where(sql`${table.endedAt} IS NULL`),
    check("time_record_period", sql`${table.endedAt} >= ${table.startedAt}`),
    check("time_record_rate", sql`${table.hourlyRateCents} >= 0`),
    check("time_record_currency", sql`${table.currency} IN ('BRL', 'USD')`),
  ],
);
