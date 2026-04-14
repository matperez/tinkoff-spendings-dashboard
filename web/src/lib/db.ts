import Database from "better-sqlite3";
import path from "node:path";

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  const configured = process.env.SPENDINGS_DB_PATH ?? "../spendings.sqlite";
  const dbPath = path.resolve(process.cwd(), configured);

  db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  return db;
}

