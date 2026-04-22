import { CasesTable } from "@/components/cases-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NotificationsPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Benachrichtigungen</CardTitle>
        <CardDescription>Ungelesene Fälle.</CardDescription>
      </CardHeader>
      <CardContent>
        <CasesTable unreadOnly />
      </CardContent>
    </Card>
  )
}
