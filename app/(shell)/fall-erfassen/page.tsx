"use client"

import * as React from "react"

import { CaseForm, type CaseFormValues } from "@/components/case-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function FallErfassenPage() {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<CaseFormValues | null>(null)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fall Erfassen</CardTitle>
        <CardDescription>
          Bitte alle Pflichtfelder ausfüllen. Kommentar ist optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CaseForm
          mode="create"
          onSaved={(values) => {
            setLastSaved(values)
            setConfirmOpen(true)
          }}
        />
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fall erfasst</AlertDialogTitle>
            <AlertDialogDescription>
              {lastSaved
                ? `FAUF: ${lastSaved.fauf} · Kundenauftrag: ${lastSaved.kundenauftrag}`
                : "Der Fall wurde gespeichert."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
