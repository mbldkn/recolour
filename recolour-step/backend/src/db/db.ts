import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function setDb(instance: Database.Database) {
  db = instance;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("DB not set. Call setDb() in index.ts (runtime) or test setup.");
  }
  return db;
}
