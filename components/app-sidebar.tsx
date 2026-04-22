"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardPlusIcon, LayoutDashboardIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV_ITEMS = [
  {
    href: "/fall-erfassen",
    label: "Fall Erfassen",
    Icon: ClipboardPlusIcon,
  },
  {
    href: "/uebersicht",
    label: "Übersicht",
    Icon: LayoutDashboardIcon,
  },
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === href}
                tooltip={label}
              >
                <Link href={href}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
