"use client"

import * as React from "react"
import Link from "next/link"
import { BellIcon, UploadIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CsvCatalogProvider, useCsvCatalog } from "@/components/csv-catalog-context"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type CaseNotification = {
  id: number
  readAt: string | null
  maschine: string
  fauf: string
  createdAt: string
}

function NotificationsBell() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<CaseNotification[]>([])
  const [count, setCount] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const load = React.useCallback(async () => {
    const res = await fetch("/api/cases", { cache: "no-store" })
    if (!res.ok) return
    const json = (await res.json()) as { rows?: CaseNotification[] }
    const unread = (json.rows ?? []).filter((row) => row.readAt == null)
    setCount(unread.length)
    setItems(unread.slice(0, 5))
  }, [])

  React.useEffect(() => {
    void load()
    const interval = window.setInterval(() => {
      void load()
    }, 15000)

    const onCasesChanged = () => {
      void load()
    }

    window.addEventListener("cases:changed", onCasesChanged)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("cases:changed", onCasesChanged)
    }
  }, [load])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!open) return
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Benachrichtigungen"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute top-1 right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Neue Benachrichtigungen
          </div>
          <div className="grid gap-1">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">Keine neuen Fälle.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-2 py-2 text-sm hover:bg-muted"
                >
                  <span className="truncate">
                    {item.maschine} · {item.fauf}
                  </span>
                  <span className="text-xs text-muted-foreground">Neu</span>
                </Link>
              ))
            )}
          </div>
          <div className="mt-2 border-t pt-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block px-2 py-2 text-sm font-medium hover:bg-muted"
            >
              Alle Benachrichtigungen öffnen
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShellFrame({
  children,
  isAdmin,
}: {
  children: React.ReactNode
  isAdmin: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const { loadFile } = useCsvCatalog()

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <NotificationsBell />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0]
                      if (!file) return
                      await loadFile(file)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="CSV hochladen"
                      >
                        <UploadIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="end">
                      CSV hochladen
                    </TooltipContent>
                  </Tooltip>

                </>
              ) : null}
            </div>
          </div>
          <main className="flex flex-1 flex-col p-4">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function ShellClient({
  children,
  isAdmin,
}: {
  children: React.ReactNode
  isAdmin: boolean
}) {
  return (
    <CsvCatalogProvider>
      <ShellFrame isAdmin={isAdmin}>{children}</ShellFrame>
    </CsvCatalogProvider>
  )
}
