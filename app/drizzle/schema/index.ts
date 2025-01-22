import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
    id: serial().primaryKey(),
    name: text().notNull(),
    message: text().notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    senderIp: text("sender_ip").notNull(),
    userAgent: text("user_agent").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false)
});

export const downloads = pgTable("downloads", {
    id: serial().primaryKey(),
    senderIp: text().notNull(),
    userAgent: text().notNull()
});
