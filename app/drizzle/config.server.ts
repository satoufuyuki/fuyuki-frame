import "dotenv/config";
import process from "node:process";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export const db = drizzle(process.env.DB_FILE_NAME ?? "");

void migrate(db, {
    migrationsFolder: "app/drizzle/migrations"
});
