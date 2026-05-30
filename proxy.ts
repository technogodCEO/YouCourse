import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// D-09: protected routes require authentication; public routes include auth pages
const protectedRoutes = ["/dashboard", "/courses", "/create"]

export default auth((req) => {
  const path = req.nextUrl.pathname
  const isProtected = protectedRoutes.some((r) => path.startsWith(r))
  const isLoggedIn = !!req.auth?.user

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))  // D-10
  }

  // Only guard /login and /signup — not all public routes (Pitfall 5 — avoids redirect loop)
  if ((path === "/login" || path === "/signup") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
