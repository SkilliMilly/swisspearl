"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CsvCatalogProvider, useCsvCatalog } from "@/components/csv-catalog-context"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function ShellFrame({ children }: { children: React.ReactNode }) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const { loadFile } = useCsvCatalog()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0]
                  if (!file) return
                  await loadFile(file)
                  // allow uploading same file again
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
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
            </div>
          </div>
          <main className="flex flex-1 flex-col p-4">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function ShellClient({ children }: { children: React.ReactNode }) {
  return (
    <CsvCatalogProvider>
      <ShellFrame>{children}</ShellFrame>
    </CsvCatalogProvider>
  )
}
