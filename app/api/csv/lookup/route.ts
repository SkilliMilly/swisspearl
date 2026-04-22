import { getDb } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const fauf = (url.searchParams.get("fauf") ?? "").trim()
  const kundenauftrag = (url.searchParams.get("kundenauftrag") ?? "").trim()

  if (!fauf && !kundenauftrag) {
    return Response.json(
      { error: "Missing query parameter: fauf or kundenauftrag" },
      { status: 400 }
    )
  }

  const db = await getDb()

  if (fauf) {
    const rows = await db`
      SELECT
        fauf,
        split_part(kundenauftrag, '.', 1) AS "kundenauftrag",
        material_nr AS "materialNr",
        format
      FROM csv_catalog
      WHERE fauf = ${fauf}
    `
    return Response.json({ rows })
  }

  const rows = await db`
    SELECT
      fauf,
      split_part(kundenauftrag, '.', 1) AS "kundenauftrag",
      material_nr AS "materialNr",
      format
    FROM csv_catalog
    WHERE split_part(kundenauftrag, '.', 1) = ${kundenauftrag}
  `
  return Response.json({ rows })
}
