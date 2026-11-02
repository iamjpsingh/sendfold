CREATE INDEX `activity_workspace` ON `activities` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_project` ON `activities` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_project` ON `comments` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `guest_share` ON `guests` (`share_id`);--> statement-breakpoint
CREATE INDEX `question_project` ON `questions` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `share_project` ON `shares` (`project_id`);