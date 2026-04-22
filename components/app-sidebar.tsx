"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangleIcon,
  ClipboardPlusIcon,
  LayoutDashboardIcon,
} from "lucide-react"

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
  {
    href: "/fehlercodes",
    label: "Fehlercodes",
    Icon: AlertTriangleIcon,
  },
] as const

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS.filter(({ href }) => {
    if (href === "/fall-erfassen") return true
    return isAdmin
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarMenu>
          {navItems.map(({ href, label, Icon }) => (
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
