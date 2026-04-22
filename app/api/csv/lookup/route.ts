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

  const db = getDb()

  if (fauf) {
    const rows = db
      .prepare(
        "SELECT fauf, kundenauftrag, material_nr as materialNr, format FROM csv_catalog WHERE fauf = ?"
      )
      .all(fauf)
    return Response.json({ rows })
  }

  const rows = db
    .prepare(
      "SELECT fauf, kundenauftrag, material_nr as materialNr, format FROM csv_catalog WHERE kundenauftrag = ?"
    )
    .all(kundenauftrag)
  return Response.json({ rows })
}
