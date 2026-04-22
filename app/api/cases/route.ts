import { z } from "zod"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

const bodySchema = z.object({
  maschine: z.string().min(1),
  auswahl: z.enum(["Ausschuss", "Q-Problem"]),
  stueckzahl: z.number().int().min(1).optional().nullable(),
  errorCodeId: z.number().int().positive().optional().nullable(),
  fauf: z.string().min(1),
  kundenauftrag: z.string().min(1),
  materialNr: z.string().min(1),
  format: z.string().min(1),
  kommentar: z.string().optional().nullable(),
  erfasser: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.auswahl === "Ausschuss" && data.errorCodeId == null) {
    ctx.addIssue({
      code: "custom",
      path: ["errorCodeId"],
      message: "Fehlercode ist erforderlich.",
    })
  }
})

export async function GET() {
  try {
    const db = await getDb()
    const rows = (await db`
      SELECT
        c.id,
        c.created_at AS "createdAt",
        c.maschine,
        c.auswahl,
        c.stueckzahl,
        c.error_code_id AS "errorCodeId",
        c.fauf,
        c.kundenauftrag,
        c.material_nr AS "materialNr",
        c.format,
        c.kommentar,
        c.erfasser,
        ec.code AS "errorCode",
        ec.title AS "errorCodeTitle",
        d.name AS "errorCodeDepartment",
        CASE
          WHEN ec.id IS NULL THEN NULL
          ELSE d.name || ' · ' || ec.code::text || ' ' || ec.title
        END AS "errorCodeLabel"
      FROM cases c
      LEFT JOIN error_codes ec ON ec.id = c.error_code_id
      LEFT JOIN departments d ON d.id = ec.department_id
      ORDER BY c.created_at DESC
      LIMIT 500
    `) as Array<{
      id: number
      createdAt: string
      maschine: string
      auswahl: "Ausschuss" | "Q-Problem"
      stueckzahl: number | null
      errorCodeId: number | null
      fauf: string
      kundenauftrag: string
      materialNr: string
      format: string
      kommentar: string | null
      erfasser: string
      errorCode: number | null
      errorCodeTitle: string | null
      errorCodeDepartment: string | null
      errorCodeLabel: string | null
    }>

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
    const createdAt = new Date().toISOString()

    const stueckzahl =
      data.auswahl === "Ausschuss" ? (data.stueckzahl ?? 1) : null
    const errorCodeId = data.auswahl === "Ausschuss" ? data.errorCodeId ?? null : null

    const db = await getDb()
    const rows = (await db`
      INSERT INTO cases (
        created_at,
        maschine,
        auswahl,
        stueckzahl,
        error_code_id,
        fauf,
        kundenauftrag,
        material_nr,
        format,
        kommentar,
        erfasser
      ) VALUES (
        ${createdAt},
        ${data.maschine},
        ${data.auswahl},
        ${stueckzahl},
        ${errorCodeId},
        ${data.fauf},
        ${data.kundenauftrag},
        ${data.materialNr},
        ${data.format},
        ${data.kommentar ?? null},
        ${data.erfasser}
      )
      RETURNING id, created_at AS "createdAt"
    `) as Array<{ id: number; createdAt: string }>

    const row = rows[0]

    return Response.json({ id: row?.id, createdAt: row?.createdAt ?? createdAt })
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
