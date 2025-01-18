import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    message: text().notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    senderIp: text("sender_ip").notNull(),
    userAgent: text("user_agent").notNull(),
    isDeleted: int("is_deleted").notNull().default(0)
});

export const downloads = sqliteTable("downloads", {
    id: int().primaryKey({ autoIncrement: true }),
    senderIp: text().notNull(),
    userAgent: text().notNull()
});
