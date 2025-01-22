import "dotenv/config";
import process from "node:process";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./app/drizzle/migrations",
    schema: "./app/drizzle/schema",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? ""
    }
});
