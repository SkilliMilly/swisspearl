import type { ReactNode } from "react"

import { ShellClient } from "@/components/shell-client"

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellClient>{children}</ShellClient>
}
