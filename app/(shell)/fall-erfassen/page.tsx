"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useCsvCatalog, type CsvRow } from "@/components/csv-catalog-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  SelectItem,
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

const formSchema = z.object({
  maschine: z
    .enum(MASCHINEN)
    .optional()
    .refine((v) => v != null, { message: "Maschine ist erforderlich." }),
  auswahl: z.enum(AUSWAHL),
  fauf: z.string().min(1, "FAUF ist erforderlich."),
  kundenauftrag: z.string().min(1, "Kundenauftrag ist erforderlich."),
  materialNr: z.string().min(1, "Material-Nr ist erforderlich."),
  format: z.string().min(1, "Format ist erforderlich."),
  kommentar: z.string().optional(),
  erfasser: z.string().min(1, "Erfasser ist erforderlich."),
})

type FormValues = z.infer<typeof formSchema>

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

export default function FallErfassenPage() {
  const csv = useCsvCatalog()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maschine: undefined,
      auswahl: "Ausschuss",
      fauf: "",
      kundenauftrag: "",
      materialNr: "",
      format: "",
      kommentar: "",
      erfasser: "",
    },
  })

  const [lookup, setLookup] = React.useState<LookupState>({ status: "idle" })
  const isAutoFillingRef = React.useRef(false)
  const shouldValidateRef = React.useRef(false)

  React.useEffect(() => {
    shouldValidateRef.current = form.formState.submitCount > 0
  }, [form.formState.submitCount])

  const clearAutoFields = React.useCallback(() => {
    isAutoFillingRef.current = true
    setLookup({ status: "idle" })
    form.setValue("materialNr", "", { shouldValidate: shouldValidateRef.current })
    form.setValue("format", "", { shouldValidate: shouldValidateRef.current })
    isAutoFillingRef.current = false
  }, [form])

  const clearAllFromKeyDelete = React.useCallback(() => {
    isAutoFillingRef.current = true
    setLookup({ status: "idle" })
    form.setValue("fauf", "", { shouldValidate: shouldValidateRef.current })
    form.setValue("kundenauftrag", "", { shouldValidate: shouldValidateRef.current })
    form.setValue("materialNr", "", { shouldValidate: shouldValidateRef.current })
    form.setValue("format", "", { shouldValidate: shouldValidateRef.current })
    isAutoFillingRef.current = false
  }, [form])

  const applyLookupRows = React.useCallback(
    (rows: CsvRow[], source: "fauf" | "kundenauftrag") => {
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

      if (source === "fauf" && uniqueKa.length === 1) {
        form.setValue("kundenauftrag", uniqueKa[0]!, {
          shouldValidate: shouldValidateRef.current,
        })
      }
      if (source === "kundenauftrag" && uniqueFauf.length === 1) {
        form.setValue("fauf", uniqueFauf[0]!, {
          shouldValidate: shouldValidateRef.current,
        })
      }

      // Materialnr is the only selectable field from CSV.
      form.setValue("materialNr", "", { shouldValidate: shouldValidateRef.current })
      form.setValue("format", "", { shouldValidate: shouldValidateRef.current })

      isAutoFillingRef.current = false

      setLookup({ status: "matched", rows, materialOptions })

      // If there's only a single material for this match, select it automatically.
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

      if (source === "fauf" && uniqueKa.length !== 1) {
        toast.warning("Mehrdeutige Zuordnung", {
          description:
            "Mehrere Kundenauftraege gefunden. Bitte Kundenauftrag pruefen.",
        })
      }
      if (source === "kundenauftrag" && uniqueFauf.length !== 1) {
        toast.warning("Mehrdeutige Zuordnung", {
          description: "Mehrere FAUF gefunden. Bitte FAUF pruefen.",
        })
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
      applyLookupRows(rows, "fauf")
    },
    [applyLookupRows, clearAllFromKeyDelete, csv]
  )

  const lookupByKundenauftrag = React.useCallback(
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

      const rows = await csv.findByKundenauftrag(key)
      applyLookupRows(rows, "kundenauftrag")
    },
    [applyLookupRows, clearAllFromKeyDelete, csv]
  )

  function onSubmit(data: FormValues) {
    toast.success("Fall erfasst", {
      description: `${data.maschine ?? ""} · ${data.auswahl}`,
    })
    form.reset({
      maschine: undefined,
      auswahl: "Ausschuss",
      fauf: "",
      kundenauftrag: "",
      materialNr: "",
      format: "",
      kommentar: "",
      erfasser: "",
    })
    setLookup({ status: "idle" })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fall Erfassen</CardTitle>
        <CardDescription>
          Bitte alle Pflichtfelder ausfüllen. Kommentar ist optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="fall-erfassen-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Controller
              name="maschine"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet>
                  <FieldLegend>Maschine</FieldLegend>
                  <RadioGroup
                    name={field.name}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v)}
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
                  >
                    {MASCHINEN.map((maschine) => {
                      const id = `fall-erfassen-maschine-${maschine.replaceAll(
                        " ",
                        "-"
                      )}`

                      return (
                        <div
                          key={maschine}
                          className="flex items-center gap-3"
                        >
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

            <Controller
              name="auswahl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="fall-erfassen-auswahl">Auswahl</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="fall-erfassen-auswahl"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Auswahl" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      <SelectItem value="Ausschuss">
                        Ausschuss (Standard)
                      </SelectItem>
                      <SelectItem value="Q-Problem">Q-Problem</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Controller
                name="fauf"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fall-erfassen-fauf">FAUF</FieldLabel>
                    <Input
                      {...field}
                      id="fall-erfassen-fauf"
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="kundenauftrag"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fall-erfassen-kundenauftrag">
                      Kundenauftrag
                    </FieldLabel>
                    <Input
                      {...field}
                      id="fall-erfassen-kundenauftrag"
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
                        void lookupByKundenauftrag(e.currentTarget.value)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return
                        e.preventDefault()
                        e.currentTarget.blur()
                      }}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="materialNr"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fall-erfassen-materialNr">
                      Material-Nr
                    </FieldLabel>
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

                          if ((opt?.formats?.length ?? 0) > 1) {
                            toast.warning("Mehrere Formate gefunden", {
                              description:
                                "Es wurden mehrere Formate fuer diese Material-Nr gefunden. Erstes Format wurde gesetzt.",
                            })
                          }
                        }}
                      >
                        <SelectTrigger
                          id="fall-erfassen-materialNr"
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
                        id="fall-erfassen-materialNr"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    )}
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="format"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fall-erfassen-format">Format</FieldLabel>
                    <Input
                      {...field}
                      id="fall-erfassen-format"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={lookup.status === "matched"}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Controller
              name="kommentar"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="fall-erfassen-kommentar">
                    Kommentar / Beschreibung
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="fall-erfassen-kommentar"
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
                  <FieldLabel htmlFor="fall-erfassen-erfasser">Erfasser</FieldLabel>
                  <Input
                    {...field}
                    id="fall-erfassen-erfasser"
                    aria-invalid={fieldState.invalid}
                    autoComplete="name"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Zurücksetzen
          </Button>
          <Button type="submit" form="fall-erfassen-form">
            Fall erfassen
          </Button>
        </Field>
      </CardFooter>
    </Card>
  )
}
