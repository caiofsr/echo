CREATE TABLE `invoice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`number` integer NOT NULL,
	`language` text NOT NULL,
	`currency` text NOT NULL,
	`exchange_rate` text,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`period_from` text NOT NULL,
	`period_to` text NOT NULL,
	`timezone` text NOT NULL,
	`client_snapshot` text NOT NULL,
	`company_snapshot` text NOT NULL,
	`payment_snapshot` text NOT NULL,
	`lines_snapshot` text NOT NULL,
	`issued_at` integer NOT NULL,
	`paid_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoice_client_number_unique" UNIQUE(`client_id`,`number`),
	CONSTRAINT "invoice_number_positive" CHECK(`invoice`.`number` > 0),
	CONSTRAINT "invoice_language" CHECK(`invoice`.`language` IN ('pt', 'en')),
	CONSTRAINT "invoice_currency" CHECK(`invoice`.`currency` IN ('BRL', 'USD')),
	CONSTRAINT "invoice_total" CHECK(`invoice`.`total_cents` >= 0)
);
--> statement-breakpoint
CREATE INDEX `invoice_client_id_idx` ON `invoice` (`client_id`);
--> statement-breakpoint
CREATE TABLE `invoice_record` (
	`invoice_id` integer NOT NULL,
	`record_id` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`record_id`) REFERENCES `time_record`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "invoice_record_unique" UNIQUE(`invoice_id`,`record_id`)
);
--> statement-breakpoint
CREATE INDEX `invoice_record_record_id_idx` ON `invoice_record` (`record_id`);
