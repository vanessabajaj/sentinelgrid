import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import Database from "better-sqlite3";

import { initializeSchema } from "@/features/sentinel/persistence/schema";

export type SentinelDatabase = Database.Database;

export function getDefaultDatabasePath(): string {
  if (process.env.SENTINEL_DB_PATH) {
    return process.env.SENTINEL_DB_PATH;
  }

  // Vitest must never touch a developer's durable local database.
  if (process.env.NODE_ENV === "test") {
    return ":memory:";
  }

  return join(process.cwd(), "data", "sentinelgrid.sqlite");
}

export function openDatabase(
  databasePath = getDefaultDatabasePath(),
): SentinelDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  if (!database.memory) {
    database.pragma("journal_mode = WAL");
  }
  initializeSchema(database);

  return database;
}
