CREATE TABLE `company_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`address` text,
	`phone` text
);
--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`instructions` text NOT NULL
);
