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

  const db = getDb()
  const insert = db.prepare(
    `INSERT INTO csv_catalog (fauf, kundenauftrag, material_nr, format) VALUES (?, ?, ?, ?)`
  )
  const clear = db.prepare(`DELETE FROM csv_catalog`)

  let inserted = 0

  const tx = db.transaction(() => {
    clear.run()

    for (const row of rows) {
      const fauf = normalizeKey(row["FAUF"])
      const kundenauftrag = normalizeKey(row["Kunden Auftrag"])
      const materialNr = normalizeKey(row["Artikelnr."])
      const format = normalizeKey(row["Farbe"])

      if (!fauf || !kundenauftrag || !materialNr || !format) {
        continue
      }

      insert.run(fauf, kundenauftrag, materialNr, format)
      inserted += 1
    }
  })

  tx()

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
