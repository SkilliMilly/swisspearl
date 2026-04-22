"use client"

import * as React from "react"
import { toast } from "sonner"

type CsvRow = {
  fauf: string
  kundenauftrag: string
  materialNr: string
  format: string
}

type CsvCatalog = {
  loaded: boolean
  rowsCount: number
  findByFauf: (fauf: string) => Promise<CsvRow[]>
  findByKundenauftrag: (kundenauftrag: string) => Promise<CsvRow[]>
  loadFile: (file: File) => Promise<void>
}

const CsvCatalogContext = React.createContext<CsvCatalog | null>(null)

function normalizeKey(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

export function CsvCatalogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [rowsCount, setRowsCount] = React.useState(0)
  const cacheRef = React.useRef<{
    byFauf: Map<string, CsvRow[]>
    byKundenauftrag: Map<string, CsvRow[]>
  }>({ byFauf: new Map(), byKundenauftrag: new Map() })

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/csv/status", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as { count?: number }
        if (!cancelled) {
          setRowsCount(json.count ?? 0)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const findByFauf = React.useCallback(async (fauf: string) => {
    const key = fauf.trim()
    if (!key) return []
    const cached = cacheRef.current.byFauf.get(key)
    if (cached) return cached

    const res = await fetch(`/api/csv/lookup?fauf=${encodeURIComponent(key)}`)
    if (!res.ok) return []
    const json = (await res.json()) as { rows?: CsvRow[] }
    const rows = json.rows ?? []
    cacheRef.current.byFauf.set(key, rows)
    return rows
  }, [])

  const findByKundenauftrag = React.useCallback(async (kundenauftrag: string) => {
    const key = kundenauftrag.trim()
    if (!key) return []
    const cached = cacheRef.current.byKundenauftrag.get(key)
    if (cached) return cached

    const res = await fetch(
      `/api/csv/lookup?kundenauftrag=${encodeURIComponent(key)}`
    )
    if (!res.ok) return []
    const json = (await res.json()) as { rows?: CsvRow[] }
    const rows = json.rows ?? []
    cacheRef.current.byKundenauftrag.set(key, rows)
    return rows
  }, [])

  const loadFile = React.useCallback(async (file: File) => {
    const body = new FormData()
    body.set("file", file)

    const res = await fetch("/api/csv/upload", {
      method: "POST",
      body,
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error("CSV konnte nicht importiert werden.", {
        description:
          json.error ??
          "Erwartete Spalten: FAUF, Kunden Auftrag, Artikelnr., Farbe (Semikolon getrennt).",
      })
      return
    }

    const json = (await res.json()) as { inserted?: number }
    const inserted = json.inserted ?? 0

    cacheRef.current.byFauf.clear()
    cacheRef.current.byKundenauftrag.clear()
    setRowsCount(inserted)

    toast.success("CSV geladen", {
      description: `${inserted} Zeilen importiert.`,
    })
  }, [])

  const value = React.useMemo<CsvCatalog>(
    () => ({
      loaded: rowsCount > 0,
      rowsCount,
      findByFauf,
      findByKundenauftrag,
      loadFile,
    }),
    [rowsCount, findByFauf, findByKundenauftrag, loadFile]
  )

  return (
    <CsvCatalogContext.Provider value={value}>
      {children}
    </CsvCatalogContext.Provider>
  )
}

export function useCsvCatalog() {
  const ctx = React.useContext(CsvCatalogContext)
  if (!ctx) {
    throw new Error("useCsvCatalog must be used within CsvCatalogProvider")
  }
  return ctx
}

export type { CsvRow }
