import type { ReactNode } from "react"
import { cookies } from "next/headers"

import { ShellClient } from "@/components/shell-client"
import { ADMIN_COOKIE, isAdminCookieValue } from "@/lib/auth"

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const isAdmin = isAdminCookieValue(cookieStore.get(ADMIN_COOKIE)?.value)

  return <ShellClient isAdmin={isAdmin}>{children}</ShellClient>
}
