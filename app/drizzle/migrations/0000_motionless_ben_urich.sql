CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`sender_ip` text NOT NULL,
	`user_agent` text NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
