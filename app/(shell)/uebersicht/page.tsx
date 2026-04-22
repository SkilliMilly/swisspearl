import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function UebersichtPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Übersicht</CardTitle>
        <CardDescription>Noch keine Daten angebunden.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Diese Seite ist aktuell ein Platzhalter.
        </p>
      </CardContent>
    </Card>
  )
}
