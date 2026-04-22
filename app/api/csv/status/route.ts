import { getDb } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const db = await getDb()
  const rows = (await db`SELECT COUNT(*)::int AS count FROM csv_catalog`) as Array<{
    count: number
  }>
  return Response.json({ count: rows[0]?.count ?? 0 })
}
