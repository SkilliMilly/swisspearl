import { z } from "zod"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

const bodySchema = z.object({
  name: z.string().trim().min(1),
})

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err != null && "code" in err && (err as { code?: string }).code === "23505"
}

export async function GET() {
  const db = await getDb()
  const rows = (await db`
    SELECT id, name
    FROM departments
    ORDER BY name ASC
  `) as Array<{ id: number; name: string }>

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
      INSERT INTO departments (name)
      VALUES (${parsed.data.name})
      RETURNING id, name
    `) as Array<{ id: number; name: string }>

    return Response.json({ row: rows[0] })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return Response.json({ error: "Department already exists" }, { status: 409 })
    }
    return Response.json(
      {
        error: "Failed to create department",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
