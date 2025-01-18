CREATE TABLE `downloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`senderIp` text NOT NULL,
	`userAgent` text NOT NULL
);
