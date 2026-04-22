import { z } from "zod"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

const bodySchema = z.object({
  departmentId: z.number().int().positive(),
  code: z.number().int().positive(),
  title: z.string().trim().min(1),
})

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err != null && "code" in err && (err as { code?: string }).code === "23505"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const departmentIdParam = url.searchParams.get("departmentId")
  const departmentId = departmentIdParam ? Number(departmentIdParam) : null
  if (departmentIdParam && (departmentId == null || !Number.isFinite(departmentId) || departmentId <= 0)) {
    return Response.json({ error: "Invalid departmentId" }, { status: 400 })
  }

  const db = await getDb()
  const rows = (departmentId != null
    ? await db`
      SELECT
        ec.id,
        ec.department_id AS "departmentId",
        d.name AS "departmentName",
        ec.code,
        ec.title
      FROM error_codes ec
      INNER JOIN departments d ON d.id = ec.department_id
      WHERE ec.department_id = ${departmentId}
      ORDER BY d.name ASC, ec.code ASC
    `
    : await db`
      SELECT
        ec.id,
        ec.department_id AS "departmentId",
        d.name AS "departmentName",
        ec.code,
        ec.title
      FROM error_codes ec
      INNER JOIN departments d ON d.id = ec.department_id
      ORDER BY d.name ASC, ec.code ASC
    `) as Array<{
    id: number
    departmentId: number
    departmentName: string
    code: number
    title: string
  }>

  return Response.json({ rows })
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }

  const db = await getDb()
  try {
    const rows = (await db`
      INSERT INTO error_codes (department_id, code, title)
      VALUES (${parsed.data.departmentId}, ${parsed.data.code}, ${parsed.data.title})
      RETURNING id
    `) as Array<{ id: number }>

    return Response.json({ row: rows[0] })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "Error code already exists" }, { status: 409 })
    }
    return Response.json(
      {
        error: "Failed to create error code",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
