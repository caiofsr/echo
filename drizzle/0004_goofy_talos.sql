CREATE TABLE `board_column` (
	`version` integer DEFAULT 1 NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `board_column_position_unique` ON `board_column` (`position`);--> statement-breakpoint
CREATE TABLE `board_task` (
	`version` integer DEFAULT 1 NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`project_id` integer,
	`column_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`column_id`) REFERENCES `board_column`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `board_task_project_id_idx` ON `board_task` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `board_task_column_position_unique` ON `board_task` (`column_id`,`position`);--> statement-breakpoint
ALTER TABLE `payment_method` DROP COLUMN `archived`;