import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "database", "exam_server.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

console.log("✅ SQLite connecté :", dbPath);

export default db;