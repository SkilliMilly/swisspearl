"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { toast } from "sonner"

import { CaseForm } from "@/components/case-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CaseRow = {
  id: number
  createdAt: string
  maschine: string
  auswahl: "Ausschuss" | "Q-Problem"
  stueckzahl: number | null
  errorCodeId: number | null
  fauf: string
  kundenauftrag: string
  materialNr: string
  format: string
  kommentar: string | null
  erfasser: string
  errorCode: number | null
  errorCodeTitle: string | null
  errorCodeDepartment: string | null
  errorCodeLabel: string | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("de-CH", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

const columns: ColumnDef<CaseRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Datum",
    cell: ({ getValue }) => formatDate(String(getValue() ?? "")),
  },
  { accessorKey: "maschine", header: "Maschine" },
  { accessorKey: "auswahl", header: "Typ" },
  {
    accessorKey: "stueckzahl",
    header: "Stück",
    cell: ({ row }) => (row.original.auswahl === "Ausschuss" ? row.original.stueckzahl ?? "" : "-")
  },
  {
    accessorKey: "errorCodeLabel",
    header: "Fehlercode",
    cell: ({ row }) => row.original.errorCodeLabel ?? "-",
  },
  { accessorKey: "fauf", header: "FAUF" },
  { accessorKey: "kundenauftrag", header: "Kundenauftrag" },
  { accessorKey: "materialNr", header: "Material-Nr" },
  { accessorKey: "format", header: "Format" },
  { accessorKey: "erfasser", header: "Erfasser" },
]

export function CasesTable() {
  const [rows, setRows] = React.useState<CaseRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<CaseRow | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  const load = React.useCallback(async () => {
    const res = await fetch("/api/cases", { cache: "no-store" })
    const text = await res.text()

    if (!res.ok) {
      toast.error("Fälle konnten nicht geladen werden.")
      setRows([])
      return
    }

    if (!text.trim()) {
      setRows([])
      return
    }

    const json = JSON.parse(text) as { rows?: CaseRow[] }
    setRows(json.rows ?? [])
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Fälle erfasst.</p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((header) => {
              const canSort = header.column.getCanSort()
              const sortDir = header.column.getIsSorted()

              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : canSort ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 px-3"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sortDir === "asc" ? (
                        <ArrowUpIcon data-icon="inline-end" />
                      ) : sortDir === "desc" ? (
                        <ArrowDownIcon data-icon="inline-end" />
                      ) : null}
                    </Button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => {
                setSelected(row.original)
                setEditOpen(true)
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fall bearbeiten</DialogTitle>
            <DialogDescription>
              Änderungen speichern. Autofill funktioniert wie bei "Fall Erfassen".
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <CaseForm
              mode="edit"
              caseId={selected.id}
              submitLabel="Speichern"
              initialValues={{
                maschine: selected.maschine,
                auswahl: selected.auswahl,
                stueckzahl:
                  selected.auswahl === "Ausschuss"
                    ? selected.stueckzahl ?? 1
                    : undefined,
                errorCodeId: selected.errorCodeId ?? null,
                fauf: selected.fauf,
                kundenauftrag: selected.kundenauftrag,
                materialNr: selected.materialNr,
                format: selected.format,
                kommentar: selected.kommentar ?? "",
                erfasser: selected.erfasser,
              }}
              onCancel={() => setEditOpen(false)}
              onSaved={async () => {
                await load()
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
