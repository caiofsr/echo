CREATE TABLE `client` (
	`version` integer DEFAULT 1 NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`legal_name` text,
	`tax_id` text,
	`address` text
);
--> statement-breakpoint
CREATE TABLE `project` (
	`version` integer DEFAULT 1 NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`client_id` integer NOT NULL,
	`hourly_rate_cents` integer NOT NULL,
	`currency` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_client_id_idx` ON `project` (`client_id`);