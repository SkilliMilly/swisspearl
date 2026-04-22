import type { NextRequest } from "next/server"

export const ADMIN_USERNAME = "admin"
export const ADMIN_PASSWORD = "root"
export const ADMIN_COOKIE = "swisspearl_admin"

export function isAdminCookieValue(value: string | undefined) {
  return value === "1"
}

export function isAdminRequest(request: NextRequest | Request) {
  return isAdminCookieValue(
    "cookies" in request ? request.cookies.get(ADMIN_COOKIE)?.value : undefined
  )
}
