import { NextResponse } from "next/server"

import { ADMIN_COOKIE, ADMIN_PASSWORD, ADMIN_USERNAME } from "@/lib/auth"

export async function POST(request: Request) {
  const formData = await request.formData()
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const nextPath = String(formData.get("next") ?? "/uebersicht")

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=1", request.url))
  }

  const response = NextResponse.redirect(new URL(nextPath.startsWith("/") ? nextPath : "/uebersicht", request.url))
  response.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
