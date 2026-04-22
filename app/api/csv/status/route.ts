import { getDb } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const db = getDb()
  const row = db
    .prepare("SELECT COUNT(*) as count FROM csv_catalog")
    .get() as { count: number }
  return Response.json({ count: row.count ?? 0 })
}
