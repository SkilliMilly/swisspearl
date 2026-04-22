"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CsvCatalogProvider, useCsvCatalog } from "@/components/csv-catalog-context"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
