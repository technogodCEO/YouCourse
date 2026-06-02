import type { NextAuthConfig } from "next-auth"

const protectedRoutes = ["/dashboard", "/generate", "/learn"]

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r))

      if (isProtected && !isLoggedIn) return false

      if ((nextUrl.pathname === "/login" || nextUrl.pathname === "/signup") && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
}
