import Papa from "papaparse"

import { getDb } from "@/lib/db"

export const runtime = "nodejs"

type CsvInputRow = Record<string, string>

function normalizeKey(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Missing file" },
      {
        status: 400,
      }
    )
  }

  const text = await file.text()

  const parsed = Papa.parse<CsvInputRow>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  })

  if (parsed.errors?.length) {
    return Response.json(
      { error: parsed.errors[0]?.message ?? "CSV parse error" },
      { status: 400 }
    )
  }

  const rows = parsed.data ?? []

  const db = await getDb()

  const validRows = rows
    .map((row) => {
      const fauf = normalizeKey(row["FAUF"])
      const kundenauftrag = normalizeKey(row["Kunden Auftrag"])
      const materialNr = normalizeKey(row["Artikelnr."])
      const format = normalizeKey(row["Farbe"])

      if (!fauf || !kundenauftrag || !materialNr || !format) {
        return null
      }

      return { fauf, kundenauftrag, materialNr, format }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)

  await db.transaction([
    db`TRUNCATE csv_catalog`,
    ...validRows.map(
      (row) =>
        db`
          INSERT INTO csv_catalog (fauf, kundenauftrag, material_nr, format)
          VALUES (${row.fauf}, ${row.kundenauftrag}, ${row.materialNr}, ${row.format})
        `
    ),
  ])

  const inserted = validRows.length

  if (inserted === 0) {
    return Response.json(
      {
        error:
          "No rows imported. Expected headers: FAUF, Kunden Auftrag, Artikelnr., Farbe (semicolon separated).",
      },
      { status: 400 }
    )
  }

  return Response.json({ inserted })
}
