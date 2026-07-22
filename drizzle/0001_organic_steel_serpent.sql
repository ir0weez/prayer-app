CREATE TABLE `verseHighlights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`book` varchar(64) NOT NULL,
	`chapter` int NOT NULL,
	`verse` int NOT NULL,
	`version` varchar(10) NOT NULL DEFAULT 'kjv',
	`highlightedText` text NOT NULL,
	`color` enum('yellow','green','blue','pink','orange') NOT NULL DEFAULT 'yellow',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verseHighlights_id` PRIMARY KEY(`id`)
);
