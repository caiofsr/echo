CREATE TABLE `time_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`hourly_rate_cents` integer NOT NULL,
	`currency` text NOT NULL,
	CONSTRAINT "time_record_period" CHECK("time_record"."ended_at" >= "time_record"."started_at"),
	CONSTRAINT "time_record_rate" CHECK("time_record"."hourly_rate_cents" >= 0),
	CONSTRAINT "time_record_currency" CHECK("time_record"."currency" IN ('BRL', 'USD'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `time_record_single_active` ON `time_record` ((1)) WHERE "time_record"."ended_at" IS NULL;--> statement-breakpoint
CREATE TABLE `timer_preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`hourly_rate_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`timezone` text DEFAULT 'America/Recife' NOT NULL,
	CONSTRAINT "timer_preferences_singleton" CHECK("timer_preferences"."id" = 1),
	CONSTRAINT "timer_preferences_rate" CHECK("timer_preferences"."hourly_rate_cents" >= 0),
	CONSTRAINT "timer_preferences_currency" CHECK("timer_preferences"."currency" IN ('BRL', 'USD'))
);
--> statement-breakpoint
CREATE TABLE `timer_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "timer_state_singleton" CHECK("timer_state"."id" = 1)
);

--> statement-breakpoint
INSERT INTO timer_preferences (id) VALUES (1);
--> statement-breakpoint
INSERT INTO timer_state (id) VALUES (1);
--> statement-breakpoint
CREATE TRIGGER time_record_start_revision AFTER INSERT ON time_record BEGIN UPDATE timer_state SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER time_record_stop_revision AFTER UPDATE OF ended_at ON time_record BEGIN UPDATE timer_state SET version = version + 1 WHERE id = 1; END;
