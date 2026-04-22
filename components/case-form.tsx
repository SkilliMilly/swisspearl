"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useCsvCatalog, type CsvRow } from "@/components/csv-catalog-context"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const MASCHINEN = [
  "Selco",
  "Schelling",
  "Homag",
  "Rover 2",
  "Rover 3",
  "Rover 4",
] as const

const AUSWAHL = ["Ausschuss", "Q-Problem"] as const

const maschinenSet = new Set<string>(MASCHINEN)

type ErrorCodeOption = {
  id: number
  departmentId: number
  departmentName: string
  code: number
  title: string
}

const formSchema = z
  .object({
    maschine: z
      .string()
      .min(1, "Maschine ist erforderlich.")
      .refine((v) => maschinenSet.has(v), {
        message: "Maschine ist erforderlich.",
      }),
    auswahl: z.enum(AUSWAHL),
    stueckzahl: z
      .number()
      .min(1, "Stückzahl darf nicht kleiner als 1 sein.")
      .refine((v) => Number.isInteger(v), {
        message: "Stückzahl muss eine ganze Zahl sein.",
      })
      .optional(),
    errorCodeId: z.number().int().positive().optional().nullable(),
    fauf: z.string().min(1, "FAUF ist erforderlich."),
    kundenauftrag: z.string().min(1, "Kundenauftrag ist erforderlich."),
    materialNr: z.string().min(1, "Material-Nr ist erforderlich."),
    format: z.string().min(1, "Format ist erforderlich."),
    kommentar: z.string().optional(),
    erfasser: z.string().min(1, "Erfasser ist erforderlich."),
  })
  .superRefine((data, ctx) => {
    if (data.auswahl !== "Ausschuss") {
      return
    }

    if (data.stueckzahl == null) {
      ctx.addIssue({
        code: "custom",
        path: ["stueckzahl"],
        message: "Stückzahl ist erforderlich.",
      })
    }

    if (data.errorCodeId == null) {
      ctx.addIssue({
        code: "custom",
        path: ["errorCodeId"],
        message: "Fehlercode ist erforderlich.",
      })
    }
  })

export type CaseFormValues = z.infer<typeof formSchema>

type LookupState =
  | { status: "idle" }
  | {
      status: "matched"
      rows: CsvRow[]
      materialOptions: Array<{ materialNr: string; formats: string[] }>
    }

function distinct(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function buildMaterialOptions(rows: CsvRow[]) {
  const byMaterial = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = byMaterial.get(r.materialNr) ?? new Set<string>()
    set.add(r.format)
    byMaterial.set(r.materialNr, set)
  }

  return [...byMaterial.entries()]
    .map(([materialNr, formatsSet]) => ({
      materialNr,
      formats: distinct([...formatsSet]),
    }))
    .sort((a, b) => a.materialNr.localeCompare(b.materialNr))
}

function defaultValues(): CaseFormValues {
  return {
    maschine: "",
    auswahl: "Ausschuss",
    stueckzahl: 1,
    errorCodeId: null,
    fauf: "",
    kundenauftrag: "",
    materialNr: "",
    format: "",
    kommentar: "",
    erfasser: "",
  }
}

export function CaseForm({
  mode,
  caseId,
  initialValues,
  submitLabel,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit"
  caseId?: number
  initialValues?: Partial<CaseFormValues>
  submitLabel?: string
  onSaved?: (values: CaseFormValues) => void
  onCancel?: () => void
}) {
  const csv = useCsvCatalog()
  const [errorCodes, setErrorCodes] = React.useState<ErrorCodeOption[]>([])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/error-codes", { cache: "no-store" })
        if (!res.ok) return
        const json = (await res.json()) as { rows?: ErrorCodeOption[] }
        if (!cancelled) {
          setErrorCodes(json.rows ?? [])
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const errorCodeGroups = React.useMemo(() => {
    const byDepartment = new Map<string, ErrorCodeOption[]>()
    for (const row of errorCodes) {
      const list = byDepartment.get(row.departmentName) ?? []
      list.push(row)
      byDepartment.set(row.departmentName, list)
    }

    return [...byDepartment.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([departmentName, codes]) => ({
        departmentName,
        codes: codes.sort((a, b) => a.code - b.code),
      }))
  }, [errorCodes])

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues(),
      ...initialValues,
    },
  })

  const [lookup, setLookup] = React.useState<LookupState>({ status: "idle" })
  const isAutoFillingRef = React.useRef(false)
  const shouldValidateRef = React.useRef(false)

  React.useEffect(() => {
    shouldValidateRef.current = form.formState.submitCount > 0
  }, [form.formState.submitCount])

  const auswahl = form.watch("auswahl")

  React.useEffect(() => {
    if (isAutoFillingRef.current) return

    if (auswahl === "Q-Problem") {
      form.setValue("stueckzahl", undefined, {
        shouldValidate: shouldValidateRef.current,
      })
      form.setValue("errorCodeId", null, {
        shouldValidate: shouldValidateRef.current,
      })
      return
    }

    const current = form.getValues("stueckzahl")
    if (current == null) {
      form.setValue("stueckzahl", 1, {
        shouldValidate: shouldValidateRef.current,
      })
    }
  }, [auswahl, form])

  const clearAutoFields = React.useCallback(() => {
    isAutoFillingRef.current = true
    setLookup({ status: "idle" })
    form.setValue("materialNr", "", {
      shouldValidate: shouldValidateRef.current,
    })
    form.setValue("format", "", {
      shouldValidate: shouldValidateRef.current,
    })
    form.setValue("errorCodeId", null, {
      shouldValidate: shouldValidateRef.current,
    })
    isAutoFillingRef.current = false
  }, [form])

  const clearAllFromKeyDelete = React.useCallback(() => {
    isAutoFillingRef.current = true
    setLookup({ status: "idle" })
    form.setValue("fauf", "", { shouldValidate: shouldValidateRef.current })
    form.setValue("kundenauftrag", "", {
      shouldValidate: shouldValidateRef.current,
    })
    form.setValue("materialNr", "", {
      shouldValidate: shouldValidateRef.current,
    })
    form.setValue("format", "", {
      shouldValidate: shouldValidateRef.current,
    })
    form.setValue("errorCodeId", null, {
      shouldValidate: shouldValidateRef.current,
    })
    isAutoFillingRef.current = false
  }, [form])

  const applyLookupRows = React.useCallback(
    (rows: CsvRow[]) => {
      if (!rows.length) {
        setLookup({ status: "idle" })
        clearAutoFields()
        toast.error("Kein Treffer in der CSV.")
        return
      }

      const materialOptions = buildMaterialOptions(rows)
      const uniqueFauf = distinct(rows.map((r) => r.fauf))
      const uniqueKa = distinct(rows.map((r) => r.kundenauftrag))

      isAutoFillingRef.current = true

      if (uniqueKa.length === 1) {
        form.setValue("kundenauftrag", uniqueKa[0]!, {
          shouldValidate: shouldValidateRef.current,
        })
      }
      if (uniqueFauf.length === 1) {
        form.setValue("fauf", uniqueFauf[0]!, {
          shouldValidate: shouldValidateRef.current,
        })
      }

      // Do not overwrite user values when editing unless we have to.
      const currentMaterial = form.getValues("materialNr")
      const currentFormat = form.getValues("format")

      if (!currentMaterial) {
        form.setValue("materialNr", "", {
          shouldValidate: shouldValidateRef.current,
        })
      }
      if (!currentFormat) {
        form.setValue("format", "", {
          shouldValidate: shouldValidateRef.current,
        })
      }

      isAutoFillingRef.current = false

      setLookup({ status: "matched", rows, materialOptions })

      // If there's only a single material, select it automatically.
      if (materialOptions.length === 1) {
        const only = materialOptions[0]!
        const nextFormat = only.formats?.[0] ?? ""

        isAutoFillingRef.current = true
        form.setValue("materialNr", only.materialNr, {
          shouldValidate: shouldValidateRef.current,
        })
        form.setValue("format", nextFormat, {
          shouldValidate: shouldValidateRef.current,
        })
        isAutoFillingRef.current = false

        if ((only.formats?.length ?? 0) > 1) {
          toast.warning("Mehrere Formate gefunden", {
            description:
              "Es wurden mehrere Formate fuer diese Material-Nr gefunden. Erstes Format wurde gesetzt.",
          })
        }
      }
    },
    [clearAutoFields, form]
  )

  const lookupByFauf = React.useCallback(
    async (raw: string) => {
      const key = raw.trim()
      if (!key) {
        clearAllFromKeyDelete()
        return
      }

      if (!csv.loaded) {
        toast.error("Bitte zuerst CSV hochladen.")
        return
      }

      const rows = await csv.findByFauf(key)
      applyLookupRows(rows)
    },
    [applyLookupRows, clearAllFromKeyDelete, csv]
  )

  // If we open the form in edit mode, try to populate material options based on current fauf.
  React.useEffect(() => {
    if (mode !== "edit") return
    if (!csv.loaded) return
    const currentFauf = form.getValues("fauf")
    if (!currentFauf) return

    let cancelled = false
    ;(async () => {
      const rows = await csv.findByFauf(currentFauf)
      if (cancelled) return
      if (rows.length) {
        applyLookupRows(rows)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyLookupRows, csv, form, mode])

  async function persist(values: CaseFormValues) {
    const payload = {
      maschine: values.maschine,
      auswahl: values.auswahl,
      stueckzahl: values.auswahl === "Ausschuss" ? values.stueckzahl ?? 1 : null,
      errorCodeId:
        values.auswahl === "Ausschuss" ? values.errorCodeId ?? null : null,
      fauf: values.fauf,
      kundenauftrag: values.kundenauftrag,
      materialNr: values.materialNr,
      format: values.format,
      kommentar: values.kommentar ?? null,
      erfasser: values.erfasser,
    }

    const url =
      mode === "edit" && caseId != null ? `/api/cases/${caseId}` : "/api/cases"
    const method = mode === "edit" ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null
      toast.error(
        mode === "edit"
          ? "Fall konnte nicht aktualisiert werden."
          : "Fall konnte nicht gespeichert werden.",
        {
          description: json?.message ?? json?.error,
        }
      )
      return false
    }

    if (mode === "edit") {
      toast.success("Fall aktualisiert")
    }
    onSaved?.(values)
    return true
  }

  async function onSubmit(values: CaseFormValues) {
    const ok = await persist(values)
    if (!ok) return

    if (mode === "create") {
      form.reset(defaultValues())
      setLookup({ status: "idle" })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="maschine"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet>
              <FieldLegend>Maschine</FieldLegend>
              <RadioGroup
                name={field.name}
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              >
                {MASCHINEN.map((maschine) => {
                  const id = `case-form-maschine-${maschine.replaceAll(" ", "-")}`
                  return (
                    <div key={maschine} className="flex items-center gap-3">
                      <RadioGroupItem
                        id={id}
                        value={maschine}
                        aria-invalid={fieldState.invalid}
                      />
                      <Label htmlFor={id}>{maschine}</Label>
                    </div>
                  )
                })}
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Controller
            name="auswahl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="case-form-auswahl">Auswahl</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="case-form-auswahl"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Auswahl" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value="Ausschuss">Ausschuss</SelectItem>
                    <SelectItem value="Q-Problem">Q-Problem</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {auswahl === "Ausschuss" ? (
            <Controller
              name="stueckzahl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="case-form-stueckzahl">Stückzahl</FieldLabel>
                  <Input
                    id="case-form-stueckzahl"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const raw = e.currentTarget.value
                      if (raw.trim() === "") {
                        field.onChange(undefined)
                        return
                      }
                      field.onChange(e.currentTarget.valueAsNumber)
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : (
            <div />
          )}

          {auswahl === "Ausschuss" ? (
            <Controller
              name="errorCodeId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="case-form-error-code">
                    Fehlercode
                  </FieldLabel>
                  <Select
                    value={field.value == null ? "" : String(field.value)}
                    onValueChange={(value) => {
                      field.onChange(value ? Number(value) : null)
                    }}
                  >
                    <SelectTrigger
                      id="case-form-error-code"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Fehlercode auswählen" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {errorCodeGroups.map((group) => (
                        <SelectGroup key={group.departmentName}>
                          <SelectLabel>{group.departmentName}</SelectLabel>
                          {group.codes.map((code) => (
                            <SelectItem key={code.id} value={String(code.id)}>
                              {code.code} {code.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : (
            <div />
          )}
        </FieldGroup>

        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Controller
            name="fauf"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="case-form-fauf">FAUF</FieldLabel>
                <Input
                  {...field}
                  id="case-form-fauf"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  onChange={(e) => {
                    field.onChange(e)
                    if (isAutoFillingRef.current) return
                    if (e.currentTarget.value.trim() === "") {
                      clearAllFromKeyDelete()
                    }
                  }}
                  onBlur={(e) => {
                    field.onBlur()
                    if (isAutoFillingRef.current) return
                    void lookupByFauf(e.currentTarget.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    e.currentTarget.blur()
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="kundenauftrag"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="case-form-kundenauftrag">Kundenauftrag</FieldLabel>
                <Input
                  {...field}
                  id="case-form-kundenauftrag"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  onChange={(e) => {
                    field.onChange(e)
                    if (isAutoFillingRef.current) return
                    if (e.currentTarget.value.trim() === "") {
                      clearAllFromKeyDelete()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    e.currentTarget.blur()
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="materialNr"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="case-form-materialNr">Material-Nr</FieldLabel>
                {lookup.status === "matched" ? (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      const opt = lookup.materialOptions.find(
                        (o) => o.materialNr === value
                      )
                      const nextFormat = opt?.formats?.[0] ?? ""
                      isAutoFillingRef.current = true
                      form.setValue("format", nextFormat, {
                        shouldValidate: shouldValidateRef.current,
                      })
                      isAutoFillingRef.current = false
                    }}
                  >
                    <SelectTrigger
                      id="case-form-materialNr"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Material-Nr auswählen" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {lookup.materialOptions.map((o) => (
                        <SelectItem key={o.materialNr} value={o.materialNr}>
                          {o.materialNr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    {...field}
                    id="case-form-materialNr"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="format"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="case-form-format">Format</FieldLabel>
                <Input
                  {...field}
                  id="case-form-format"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  disabled={lookup.status === "matched"}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Controller
          name="kommentar"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="case-form-kommentar">
                Kommentar / Beschreibung
              </FieldLabel>
              <Textarea
                {...field}
                id="case-form-kommentar"
                aria-invalid={fieldState.invalid}
                className="min-h-28"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="erfasser"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="case-form-erfasser">Erfasser</FieldLabel>
              <Input
                {...field}
                id="case-form-erfasser"
                aria-invalid={fieldState.invalid}
                autoComplete="name"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field orientation="horizontal">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          ) : mode === "create" ? (
            <Button type="button" variant="outline" onClick={() => form.reset(defaultValues())}>
              Zurücksetzen
            </Button>
          ) : (
            <div />
          )}

          <Button type="submit">{submitLabel ?? (mode === "edit" ? "Speichern" : "Fall erfassen")}</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
