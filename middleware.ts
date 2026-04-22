import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_COOKIE, isAdminCookieValue } from "@/lib/auth"

const PROTECTED_PATHS = ["/uebersicht", "/fehlercodes"]

function isProtectedApi(pathname: string, method: string) {
  if (pathname === "/api/departments") return method !== "GET"
  if (pathname.startsWith("/api/departments/")) return true
  if (pathname === "/api/error-codes") return method !== "GET"
  if (pathname.startsWith("/api/error-codes/")) return true
  if (pathname === "/api/csv/upload") return true
  if (pathname === "/api/cases" && method !== "POST") return true
  if (pathname.startsWith("/api/cases/") && method !== "POST") return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdmin = isAdminCookieValue(request.cookies.get(ADMIN_COOKIE)?.value)

  if (pathname === "/login") {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/uebersicht", request.url))
    }
    return NextResponse.next()
  }

  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path)) && !isAdmin) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isProtectedApi(pathname, request.method) && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/uebersicht/:path*", "/fehlercodes/:path*", "/api/:path*"],
}
