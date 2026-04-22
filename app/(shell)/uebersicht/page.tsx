import { CasesTable } from "@/components/cases-table"
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
        <CardDescription>Erfasste Fälle.</CardDescription>
      </CardHeader>
      <CardContent>
        <CasesTable />
      </CardContent>
    </Card>
  )
}
