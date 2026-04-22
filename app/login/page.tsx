import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ADMIN_COOKIE, isAdminCookieValue } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const cookieStore = await cookies()
  if (isAdminCookieValue(cookieStore.get(ADMIN_COOKIE)?.value)) {
    redirect("/uebersicht")
  }

  const params = await searchParams
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/uebersicht"
  const hasError = params.error === "1"

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Nur für Übersicht, Fehlercodes und CSV-Upload.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post" className="grid gap-4">
            <input type="hidden" name="next" value={nextPath} />
            <div className="grid gap-2">
              <label htmlFor="username" className="text-sm font-medium">
                Benutzername
              </label>
              <Input id="username" name="username" autoComplete="username" required />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Passwort
              </label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {hasError ? (
              <p className="text-sm text-destructive">Login fehlgeschlagen.</p>
            ) : null}
            <Button type="submit">Anmelden</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
