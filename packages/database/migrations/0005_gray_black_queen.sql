CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`actor_key` text NOT NULL,
	`actor_kind` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_email` text,
	`share_id` text,
	`share_label` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`resource_id` text,
	`ip_address` text,
	`country` text,
	`user_agent` text,
	`dedupe_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_project_time` ON `audit_events` (`project_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `audit_actor_time` ON `audit_events` (`project_id`,`actor_key`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `audit_dedupe` ON `audit_events` (`dedupe_key`);
--> statement-breakpoint
INSERT INTO audit_events (id, project_id, actor_key, actor_kind, actor_name, action, detail, dedupe_key, created_at)
SELECT id, project_id, 'legacy:' || author, 'legacy', author, action, detail, 'legacy:' || id, created_at FROM activities WHERE project_id IS NOT NULL;
