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
    const stueckzahl =
      data.auswahl === "Ausschuss" ? (data.stueckzahl ?? 1) : null

    const db = await getDb()
    const rows = (await db`
      UPDATE cases
      SET
        maschine = ${data.maschine},
        auswahl = ${data.auswahl},
        stueckzahl = ${stueckzahl},
        fauf = ${data.fauf},
        kundenauftrag = ${data.kundenauftrag},
        material_nr = ${data.materialNr},
        format = ${data.format},
        kommentar = ${data.kommentar ?? null},
        erfasser = ${data.erfasser}
      WHERE id = ${caseId}
      RETURNING id
    `) as Array<{ id: number }>

    if (rows.length === 0) {
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
