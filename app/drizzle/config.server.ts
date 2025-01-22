import "dotenv/config";
import process from "node:process";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// eslint-disable-next-line typescript/no-non-null-assertion
export const db = drizzle(process.env.DATABASE_URL!);

void migrate(db, {
    migrationsFolder: "drizzle/migrations"
});
