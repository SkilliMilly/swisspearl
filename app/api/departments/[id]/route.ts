import { z } from "zod"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

const bodySchema = z.object({
  name: z.string().trim().min(1),
})

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err != null && "code" in err && (err as { code?: string }).code === "23505"
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const departmentId = Number(id)
  if (!Number.isFinite(departmentId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }

  const db = await getDb()
  try {
    const rows = (await db`
      UPDATE departments
      SET name = ${parsed.data.name}
      WHERE id = ${departmentId}
      RETURNING id, name
    `) as Array<{ id: number; name: string }>

    if (rows.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json({ row: rows[0] })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "Department already exists" }, { status: 409 })
    }
    return Response.json(
      {
        error: "Failed to update department",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
