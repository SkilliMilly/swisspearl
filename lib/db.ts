import { neon } from "@neondatabase/serverless"

type Db = ReturnType<typeof neon>

const INITIAL_DEPARTMENTS = ["PV Bearbeitung", "PM2 (Rohplatten)"] as const

const INITIAL_ERROR_CODES = [
  { department: "PV Bearbeitung", code: 661, title: "Verschnitt" },
  { department: "PV Bearbeitung", code: 662, title: "Verbohrt / Verfräst" },
  { department: "PV Bearbeitung", code: 663, title: "AVOR / Programmfehler" },
  { department: "PV Bearbeitung", code: 664, title: "Lifterbeschädigung" },
  { department: "PV Bearbeitung", code: 665, title: "Anlagentechnisch" },
  { department: "PM2 (Rohplatten)", code: 201, title: "Blechknick" },
  { department: "PM2 (Rohplatten)", code: 202, title: "Blechbeulen" },
  { department: "PM2 (Rohplatten)", code: 203, title: "Einschluss" },
  { department: "PM2 (Rohplatten)", code: 204, title: "Fremdkörper" },
  { department: "PM2 (Rohplatten)", code: 205, title: "Wasserflecken" },
  { department: "PM2 (Rohplatten)", code: 206, title: "Ölflecken / Fettflecken" },
  { department: "PM2 (Rohplatten)", code: 207, title: "Flecken" },
  { department: "PM2 (Rohplatten)", code: 208, title: "Fehlerhafte Kerben" },
  { department: "PM2 (Rohplatten)", code: 209, title: "Überlappung Lage" },
  { department: "PM2 (Rohplatten)", code: 210, title: "Überlappung Platten" },
  {
    department: "PM2 (Rohplatten)",
    code: 211,
    title: "Fehlende / unvollständige Löcher",
  },
  { department: "PM2 (Rohplatten)", code: 212, title: "Stanzschnitt" },
  { department: "PM2 (Rohplatten)", code: 213, title: "Verpressung" },
  { department: "PM2 (Rohplatten)", code: 214, title: "Schlechtes stapeln" },
  { department: "PM2 (Rohplatten)", code: 215, title: "Rost" },
  { department: "PM2 (Rohplatten)", code: 216, title: "Plattenrisse" },
  { department: "PM2 (Rohplatten)", code: 217, title: "Bildrahmen" },
  { department: "PM2 (Rohplatten)", code: 218, title: "Verschmutzung / Verunreinigung" },
  { department: "PM2 (Rohplatten)", code: 219, title: "Beschädigte Platten" },
  { department: "PM2 (Rohplatten)", code: 220, title: "Vliessqualität" },
  { department: "PM2 (Rohplatten)", code: 221, title: "Falsche Position stanzen" },
  {
    department: "PM2 (Rohplatten)",
    code: 222,
    title: "Abdruck Lochblech/Saugertuch",
  },
  { department: "PM2 (Rohplatten)", code: 224, title: "Zu dünn" },
  { department: "PM2 (Rohplatten)", code: 225, title: "Zu dick" },
  { department: "PM2 (Rohplatten)", code: 226, title: "Blechzentrierung" },
  { department: "PM2 (Rohplatten)", code: 299, title: "Diverses / unbestimmt" },
] as const

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
          read_at TIMESTAMPTZ,
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
      await db`ALTER TABLE cases ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`
      await db`ALTER TABLE cases ADD COLUMN IF NOT EXISTS error_code_id INTEGER`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at)`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_fauf ON cases (fauf)`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_kundenauftrag ON cases (kundenauftrag)`
      await db`CREATE INDEX IF NOT EXISTS idx_cases_read_at ON cases (read_at)`

      await db`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        )
      `

      await db`
        CREATE TABLE IF NOT EXISTS error_codes (
          id SERIAL PRIMARY KEY,
          department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
          code INTEGER NOT NULL,
          title TEXT NOT NULL
        )
      `
      await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_error_codes_department_code ON error_codes (department_id, code)`
      await db`ALTER TABLE cases ADD COLUMN IF NOT EXISTS error_code_id INTEGER REFERENCES error_codes(id)`

      const deptCount = await db`SELECT COUNT(*)::int AS count FROM departments`
      if ((deptCount as Array<{ count: number }>)[0]?.count === 0) {
        for (const department of INITIAL_DEPARTMENTS) {
          await db`INSERT INTO departments (name) VALUES (${department}) ON CONFLICT (name) DO NOTHING`
        }

        for (const item of INITIAL_ERROR_CODES) {
          await db`
            INSERT INTO error_codes (department_id, code, title)
            SELECT id, ${item.code}, ${item.title}
            FROM departments
            WHERE name = ${item.department}
            ON CONFLICT (department_id, code) DO NOTHING
          `
        }
      }
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
