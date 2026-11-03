CREATE TABLE `project_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`note` text DEFAULT '' NOT NULL,
	`important` integer DEFAULT false NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`author` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_project` ON `project_items` (`project_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `shares` ADD `file_id` text REFERENCES files(id);--> statement-breakpoint
ALTER TABLE `shares` ADD `view_mode` text DEFAULT 'compact' NOT NULL;