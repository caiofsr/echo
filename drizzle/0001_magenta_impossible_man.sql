ALTER TABLE `session` ADD `credential_version` text;--> statement-breakpoint
ALTER TABLE `user` ADD `credential_version` text DEFAULT '' NOT NULL;