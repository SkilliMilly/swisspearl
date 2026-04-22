import { neon } from "@neondatabase/serverless"

type Db = ReturnType<typeof neon>

declare global {
  // eslint-disable-next-line no-var
  var __swisspearlSchemaReady: Promise<void> | undefined
}

function getConnectionString() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error("Missing Postgres connection string. Set POSTGRES_URL or DATABASE_URL.")
  }
  return url
}

const db = neon(getConnectionString()) as Db

function ensureSchema() {
  if (!global.__swisspearlSchemaReady) {
    global.__swisspearlSchemaReady = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS csv_catalog (
          fauf TEXT NOT NULL,
          kundenauftrag TEXT NOT NULL,
          material_nr TEXT NOT NULL,
          format TEXT NOT NULL
        )
      `
      await db`CREATE INDEX IF NOT EXISTS idx_csv_catalog_fauf ON csv_catalog (fauf)`
      await db`CREATE INDEX IF NOT EXISTS idx_csv_catalog_kundenauftrag ON csv_catalog (kundenauftrag)`
      await db`CREATE INDEX IF NOT EXISTS idx_csv_catalog_material ON csv_catalog (material_nr)`

      await db`
        CREATE TABLE IF NOT EXISTS cases (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          maschine TEXT NOT NULL,
          auswahl TEXT NOT NULL,
          stueckzahl INTEGER,
          fauf TEXT NOT NULL,
          kundenauftrag TEXT NOT NULL,
          material_nr TEXT NOT NULL,
          format TEXT NOT NULL,
          kommentar TEXT,
          erfasser TEXT NOT NULL
        )
      `
      await db`CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at)`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_fauf ON cases (fauf)`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_kundenauftrag ON cases (kundenauftrag)`
    })().catch((error) => {
      global.__swisspearlSchemaReady = undefined
      throw error
    })
  }

  return global.__swisspearlSchemaReady
}

export async function getDb() {
  await ensureSchema()
  return db
}
