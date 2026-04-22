import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

type Db = Database.Database

declare global {
  // eslint-disable-next-line no-var
  var __swisspearlDb: Db | undefined
}

function initDb(db: Db) {
  db.pragma("journal_mode = WAL")
  db.exec(`
    CREATE TABLE IF NOT EXISTS csv_catalog (
      fauf TEXT NOT NULL,
      kundenauftrag TEXT NOT NULL,
      material_nr TEXT NOT NULL,
      format TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_csv_catalog_fauf ON csv_catalog (fauf);
    CREATE INDEX IF NOT EXISTS idx_csv_catalog_kundenauftrag ON csv_catalog (kundenauftrag);
    CREATE INDEX IF NOT EXISTS idx_csv_catalog_material ON csv_catalog (material_nr);
  `)
}

export function getDb() {
  if (global.__swisspearlDb) return global.__swisspearlDb

  const dbPath = path.join(process.cwd(), "data", "app.db")
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  const db = new Database(dbPath)
  initDb(db)
  global.__swisspearlDb = db
  return db
}
