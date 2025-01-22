CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderIp" text NOT NULL,
	"userAgent" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text NOT NULL,
	"sender_ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
