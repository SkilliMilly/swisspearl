"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DepartmentRow = {
  id: number
  name: string
}

type ErrorCodeRow = {
  id: number
  departmentId: number
  departmentName: string
  code: number
  title: string
}

type DepartmentFormState = {
  name: string
}

type ErrorCodeFormState = {
  departmentId: string
  code: string
  title: string
}

const emptyDepartmentForm = (): DepartmentFormState => ({ name: "" })
const emptyErrorCodeForm = (): ErrorCodeFormState => ({
  departmentId: "",
  code: "",
  title: "",
})

export default function FehlercodesPage() {
  const [departments, setDepartments] = React.useState<DepartmentRow[]>([])
  const [errorCodes, setErrorCodes] = React.useState<ErrorCodeRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [departmentFilter, setDepartmentFilter] = React.useState("all")

  const [departmentDialogOpen, setDepartmentDialogOpen] = React.useState(false)
  const [departmentMode, setDepartmentMode] = React.useState<"create" | "edit">("create")
  const [departmentId, setDepartmentId] = React.useState<number | null>(null)
  const [departmentForm, setDepartmentForm] = React.useState<DepartmentFormState>(
    emptyDepartmentForm()
  )

  const [errorCodeDialogOpen, setErrorCodeDialogOpen] = React.useState(false)
  const [errorCodeMode, setErrorCodeMode] = React.useState<"create" | "edit">("create")
  const [errorCodeId, setErrorCodeId] = React.useState<number | null>(null)
  const [errorCodeForm, setErrorCodeForm] = React.useState<ErrorCodeFormState>(
    emptyErrorCodeForm()
  )

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [deptRes, codeRes] = await Promise.all([
        fetch("/api/departments", { cache: "no-store" }),
        fetch("/api/error-codes", { cache: "no-store" }),
      ])

      if (deptRes.ok) {
        const deptJson = (await deptRes.json()) as { rows?: DepartmentRow[] }
        setDepartments(deptJson.rows ?? [])
      }

      if (codeRes.ok) {
        const codeJson = (await codeRes.json()) as { rows?: ErrorCodeRow[] }
        setErrorCodes(codeJson.rows ?? [])
      }
    } catch {
      toast.error("Daten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const visibleErrorCodes = React.useMemo(() => {
    if (departmentFilter === "all") return errorCodes
    return errorCodes.filter((row) => String(row.departmentId) === departmentFilter)
  }, [departmentFilter, errorCodes])

  async function saveDepartment() {
    const body = { name: departmentForm.name.trim() }
    const res =
      departmentMode === "create"
        ? await fetch("/api/departments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/departments/${departmentId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string; message?: string } | null
      toast.error(json?.message ?? json?.error ?? "Abteilung konnte nicht gespeichert werden.")
      return
    }

    setDepartmentDialogOpen(false)
    setDepartmentId(null)
    setDepartmentForm(emptyDepartmentForm())
    await loadData()
    toast.success("Abteilung gespeichert")
  }

  async function saveErrorCode() {
    const body = {
      departmentId: Number(errorCodeForm.departmentId),
      code: Number(errorCodeForm.code),
      title: errorCodeForm.title.trim(),
    }

    const res =
      errorCodeMode === "create"
        ? await fetch("/api/error-codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/error-codes/${errorCodeId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string; message?: string } | null
      toast.error(json?.message ?? json?.error ?? "Fehlercode konnte nicht gespeichert werden.")
      return
    }

    setErrorCodeDialogOpen(false)
    setErrorCodeId(null)
    setErrorCodeForm(emptyErrorCodeForm())
    await loadData()
    toast.success("Fehlercode gespeichert")
  }

  return (
    <div className="grid gap-4">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Abteilungen</CardTitle>
            <CardDescription>Abteilungen für die Fehlercodes verwalten.</CardDescription>
          </div>
          <Button
            type="button"
            onClick={() => {
              setDepartmentMode("create")
              setDepartmentId(null)
              setDepartmentForm(emptyDepartmentForm())
              setDepartmentDialogOpen(true)
            }}
          >
            Neu
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Lädt...</p>
          ) : departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Abteilungen erfasst.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-28">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell>{department.name}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDepartmentMode("edit")
                          setDepartmentId(department.id)
                          setDepartmentForm({ name: department.name })
                          setDepartmentDialogOpen(true)
                        }}
                      >
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Fehlercodes</CardTitle>
            <CardDescription>Codes pro Abteilung verwalten.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Abteilung filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Abteilungen</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => {
                setErrorCodeMode("create")
                setErrorCodeId(null)
                setErrorCodeForm(emptyErrorCodeForm())
                setErrorCodeDialogOpen(true)
              }}
            >
              Neu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visibleErrorCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Fehlercodes erfasst.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abteilung</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="w-28">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleErrorCodes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.departmentName}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setErrorCodeMode("edit")
                          setErrorCodeId(row.id)
                          setErrorCodeForm({
                            departmentId: String(row.departmentId),
                            code: String(row.code),
                            title: row.title,
                          })
                          setErrorCodeDialogOpen(true)
                        }}
                      >
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {departmentMode === "create" ? "Abteilung neu" : "Abteilung bearbeiten"}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="department-name">Name</FieldLabel>
              <Input
                id="department-name"
                value={departmentForm.name}
                onChange={(e) =>
                  setDepartmentForm((current) => ({ ...current, name: e.currentTarget.value }))
                }
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDepartmentDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button type="button" onClick={() => void saveDepartment()}>
                Speichern
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={errorCodeDialogOpen} onOpenChange={setErrorCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {errorCodeMode === "create" ? "Fehlercode neu" : "Fehlercode bearbeiten"}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="error-code-department">Abteilung</FieldLabel>
              <Select
                value={errorCodeForm.departmentId}
                onValueChange={(value) =>
                  setErrorCodeForm((current) => ({ ...current, departmentId: value }))
                }
              >
                <SelectTrigger id="error-code-department">
                  <SelectValue placeholder="Abteilung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="error-code-code">Code</FieldLabel>
              <Input
                id="error-code-code"
                type="number"
                inputMode="numeric"
                value={errorCodeForm.code}
                onChange={(e) =>
                  setErrorCodeForm((current) => ({ ...current, code: e.currentTarget.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="error-code-title">Bezeichnung</FieldLabel>
              <Input
                id="error-code-title"
                value={errorCodeForm.title}
                onChange={(e) =>
                  setErrorCodeForm((current) => ({ ...current, title: e.currentTarget.value }))
                }
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setErrorCodeDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button type="button" onClick={() => void saveErrorCode()}>
                Speichern
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </div>
  )
}
