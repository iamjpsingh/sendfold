CREATE TABLE `project_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_member` ON `project_members` (`project_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `member_user` ON `project_members` (`user_id`);
--> statement-breakpoint
INSERT INTO project_members (project_id, user_id, role, created_at)
SELECT p.id, u.id, CASE WHEN u.role = 'admin' THEN 'admin' ELSE 'editor' END, p.created_at
FROM projects p JOIN user u ON u.workspace_id = p.workspace_id
WHERE u.role != 'super_admin';
--> statement-breakpoint
UPDATE user SET role = 'member' WHERE role = 'admin';
