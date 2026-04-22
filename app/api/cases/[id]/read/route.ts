import { getDb } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const caseId = Number(id)
    if (!Number.isFinite(caseId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 })
    }

    const db = await getDb()
    const rows = (await db`
      UPDATE cases
      SET read_at = NOW()
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
        error: "Failed to mark case as read",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const caseId = Number(id)
    if (!Number.isFinite(caseId)) {
      return Response.json({ error: "Invalid id" }, { status: 400 })
    }

    const db = await getDb()
    const rows = (await db`
      UPDATE cases
      SET read_at = NULL
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
        error: "Failed to mark case as unread",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
