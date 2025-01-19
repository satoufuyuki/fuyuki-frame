import "dotenv/config";
import process from "node:process";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:data/database.db");

void migrate(db, {
    migrationsFolder: "drizzle/migrations"
});
