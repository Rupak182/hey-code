CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`messages` text NOT NULL
);
