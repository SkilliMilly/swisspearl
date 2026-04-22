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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const caseId = Number(id)
    if (!Number.isFinite(caseId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 })
    }

    const data = parsed.data
    const db = getDb()

    const stueckzahl =
      data.auswahl === "Ausschuss" ? (data.stueckzahl ?? 1) : null

    const stmt = db.prepare(
      `
      UPDATE cases
      SET
        maschine = ?,
        auswahl = ?,
        stueckzahl = ?,
        fauf = ?,
        kundenauftrag = ?,
        material_nr = ?,
        format = ?,
        kommentar = ?,
        erfasser = ?
      WHERE id = ?
    `
    )

    const info = stmt.run(
      data.maschine,
      data.auswahl,
      stueckzahl,
      data.fauf,
      data.kundenauftrag,
      data.materialNr,
      data.format,
      data.kommentar ?? null,
      data.erfasser,
      caseId
    )

    if (info.changes === 0) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      {
        error: "Failed to update case",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
