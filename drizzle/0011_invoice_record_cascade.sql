PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice_record` (
	`invoice_id` integer NOT NULL,
	`record_id` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`record_id`) REFERENCES `time_record`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invoice_record`("invoice_id", "record_id") SELECT "invoice_id", "record_id" FROM `invoice_record`;--> statement-breakpoint
DROP TABLE `invoice_record`;--> statement-breakpoint
ALTER TABLE `__new_invoice_record` RENAME TO `invoice_record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoice_record_record_id_idx` ON `invoice_record` (`record_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_record_unique` ON `invoice_record` (`invoice_id`,`record_id`);