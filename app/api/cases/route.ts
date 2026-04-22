import { z } from "zod"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

const bodySchema = z.object({
  maschine: z.string().min(1),
  auswahl: z.enum(["Ausschuss", "Q-Problem"]),
  stueckzahl: z.number().int().min(1).optional().nullable(),
  fauf: z.string().min(1),
  kundenauftrag: z.string().min(1),
  materialNr: z.string().min(1),
  format: z.string().min(1),
  kommentar: z.string().optional().nullable(),
  erfasser: z.string().min(1),
})

export async function GET() {
  try {
    const db = getDb()
    const rows = db
      .prepare(
        `
        SELECT
          id,
          created_at as createdAt,
          maschine,
          auswahl,
          stueckzahl as stueckzahl,
          fauf,
          kundenauftrag,
          material_nr as materialNr,
          format,
          kommentar,
          erfasser
        FROM cases
        ORDER BY datetime(created_at) DESC
        LIMIT 500
      `
      )
      .all()

    return Response.json({ rows })
  } catch (err) {
    return Response.json(
      {
        error: "Failed to load cases",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 })
    }

    const data = parsed.data
    const db = getDb()
    const createdAt = new Date().toISOString()

    const stueckzahl =
      data.auswahl === "Ausschuss" ? (data.stueckzahl ?? 1) : null

    const stmt = db.prepare(
      `
      INSERT INTO cases (
        created_at,
        maschine,
        auswahl,
        stueckzahl,
        fauf,
        kundenauftrag,
        material_nr,
        format,
        kommentar,
        erfasser
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    const info = stmt.run(
      createdAt,
      data.maschine,
      data.auswahl,
      stueckzahl,
      data.fauf,
      data.kundenauftrag,
      data.materialNr,
      data.format,
      data.kommentar ?? null,
      data.erfasser
    )

    return Response.json({ id: info.lastInsertRowid, createdAt })
  } catch (err) {
    return Response.json(
      {
        error: "Failed to create case",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
