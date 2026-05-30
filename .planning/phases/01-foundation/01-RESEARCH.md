# Phase 1: Foundation - Research

**Researched:** 2026-05-30
**Domain:** Next.js App Router scaffold, Drizzle/Neon PostgreSQL, Auth.js v5 credentials authentication, Resend email
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 1 creates auth tables only — `users`, `accounts`, `verification_tokens`. No course/video/question/progress tables yet.
- **D-02:** The `users` table includes a nullable `display_name` column.
- **D-03:** Schema managed via Drizzle ORM with `drizzle-kit`. Use `@neondatabase/serverless` driver for Neon.
- **D-04:** After sign-up and login, redirect users to `/dashboard`.
- **D-05:** Use **Resend** for password reset emails. Free tier (3,000 emails/mo), native Auth.js/Next.js integration.
- **D-06:** Auth.js v5's built-in email adapter wires to Resend — no custom mailer needed.
- **D-07:** JWT stateless sessions (Auth.js default). Session encoded in a signed httpOnly cookie — no sessions table required.
- **D-08:** Use `middleware.ts` / `proxy.ts` (Auth.js v5 middleware export) for centralized route protection. Runs at the edge before any page renders.
- **D-09:** Protected matcher: `/dashboard` and any future `/courses/*`, `/create/*` routes. Public routes: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- **D-10:** Unauthenticated access to a protected route redirects to `/login`.

### Claude's Discretion

- Page layout/styling within Tailwind v4 — standard clean auth UI is fine; no specific design reference given.
- Exact Drizzle schema column types (text vs varchar, timestamp precision) — use sensible Postgres defaults.
- Error handling UX on auth forms (inline field errors vs toast) — standard pattern is acceptable.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | Credentials provider + Server Action signup flow + bcryptjs password hashing + Drizzle insert |
| AUTH-02 | User can log in with email and password | Auth.js Credentials provider authorize callback + signIn Server Action |
| AUTH-03 | User can reset password via email link | Custom password reset token table + Resend email + reset Server Actions (two-step) |
| AUTH-04 | User session persists across browser refresh | JWT stateless session in httpOnly cookie (7-day expiry), verified by proxy.ts on every request |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Next.js 16 project scaffold with Auth.js v5 email/password authentication. The stack is fully locked in CLAUDE.md — this research fills in the precise implementation mechanics so the planner can write concrete tasks.

The most important discovery is that **Auth.js v5 does NOT provide built-in password reset for Credentials provider users.** The built-in email provider handles magic links (passwordless), not password recovery. Password reset requires a custom implementation: a `password_reset_tokens` table, two Server Actions (request-reset and apply-new-password), and a Resend email call. This is well-documented community pattern but is bespoke code, not a configuration option.

The second key finding is the **`proxy.ts` naming change in Next.js 16.** The old `middleware.ts` name still works but the Next.js 16 official docs use `proxy.ts` exclusively. The Auth.js v5 protected routes pattern exports `auth as proxy` into this file, with a matcher that skips static assets.

**Primary recommendation:** Scaffold with `create-next-app`, install auth/DB packages, implement auth tables and Auth.js config, build sign-up/login/forgot-password/reset-password pages as Server Component + Client form pairs, and wire `proxy.ts` route protection. Password reset is a custom three-file feature, not a library toggle.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x (latest) | Full-stack framework | App Router, Server Actions, Turbopack — locked in CLAUDE.md |
| next-auth (beta) | 4.24.14 | Auth.js v5 — authentication | Only Auth lib with App Router Server Component support; listed in Next.js 16 official auth docs |
| @auth/drizzle-adapter | 1.11.2 | Connects Auth.js to Drizzle ORM | Official adapter from Auth.js monorepo |
| drizzle-orm | 0.45.2 | Database ORM | TypeScript-native, edge-compatible, zero-overhead SQL; locked in CLAUDE.md |
| drizzle-kit | 0.31.10 | Schema migrations | Paired CLI for drizzle-orm; `push` for dev, `migrate` for prod |
| @neondatabase/serverless | 1.1.0 | Neon Postgres driver | HTTP-based serverless driver — locked in CLAUDE.md (D-03) |
| bcryptjs | 3.0.3 | Password hashing | Pure-JS bcrypt — works in Edge Runtime and serverless; `bcrypt` (native) does NOT work in Vercel/edge |
| resend | 6.12.4 | Transactional email | Password reset emails — locked in CLAUDE.md (D-05); native Next.js integration |
| zod | 4.4.3 | Schema validation | Validate sign-up/login form inputs in Server Actions; locked in CLAUDE.md |
| jose | 6.2.3 | JWT crypto | Edge-compatible JWT signing/verification for custom session utilities; locked in CLAUDE.md |
| server-only | latest | Bundle safety guard | Prevents DB/LLM modules from leaking into client bundle |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 4.x | Styling | Auth form layouts, responsive design; locked in CLAUDE.md |
| typescript | 5.x | Type safety | Default in create-next-app; catches data-shape mismatches |
| @types/bcryptjs | latest | Types for bcryptjs | Needed since bcryptjs ships without bundled types |
| crypto (Node built-in) | — | Token generation | `crypto.randomBytes(32).toString('hex')` for password reset tokens — no install needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | bcrypt | bcrypt is faster but requires native C++ bindings — breaks on Vercel edge/serverless |
| custom reset token table | Auth.js Email provider | Email provider is magic-link only; does not reset passwords for credentials users |
| resend SDK | nodemailer | Resend is simpler, has React email templates, free tier is generous; nodemailer needs SMTP config |

### Installation

```bash
# Scaffold
npx create-next-app@latest youcourse --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install next-auth@beta @auth/drizzle-adapter

# Password hashing
npm install bcryptjs
npm install -D @types/bcryptjs

# Email
npm install resend

# Validation and session crypto
npm install zod jose

# Bundle guard
npm install server-only
```

**Version verification (run before pinning in package.json):**

```bash
npm view next-auth version        # 4.24.14 verified 2026-05-30
npm view drizzle-orm version      # 0.45.2 verified 2026-05-30
npm view @auth/drizzle-adapter version  # 1.11.2 verified 2026-05-30
npm view bcryptjs version         # 3.0.3 verified 2026-05-30
npm view resend version           # 6.12.4 verified 2026-05-30
npm view @neondatabase/serverless version  # 1.1.0 verified 2026-05-30
npm view drizzle-kit version      # 0.31.10 verified 2026-05-30
npm view zod version              # 4.4.3 verified 2026-05-30
npm view jose version             # 6.2.3 verified 2026-05-30
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── dashboard/
│   │   └── page.tsx           # Protected — placeholder in Phase 1
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/route.ts
│   └── layout.tsx
├── components/
│   └── auth/
│       ├── login-form.tsx     # 'use client' — form + useActionState
│       ├── signup-form.tsx
│       ├── forgot-password-form.tsx
│       └── reset-password-form.tsx
├── lib/
│   ├── auth.ts                # NextAuth() config — single source of exports
│   ├── db/
│   │   ├── index.ts           # Drizzle db client
│   │   └── schema.ts          # All table definitions
│   ├── session.ts             # encrypt/decrypt helpers (jose)
│   ├── dal.ts                 # verifySession(), getUser() — server-only
│   └── definitions.ts         # Zod schemas, FormState types
├── actions/
│   └── auth.ts                # signup, login, logout, requestPasswordReset, resetPassword
└── emails/
    └── reset-password.tsx     # React email template for Resend
proxy.ts                       # Route protection (Next.js 16 name for middleware)
auth.ts                        # Re-export or main NextAuth config (root level)
drizzle.config.ts
```

### Pattern 1: Auth.js v5 Configuration

**What:** Single `NextAuth()` call at `auth.ts` (root or `src/lib/auth.ts`) exports all needed functions.
**When to use:** Always — this is the Auth.js v5 standard.

```typescript
// src/lib/auth.ts
// Source: https://authjs.dev/getting-started/installation
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user || !user.password) return null
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) return null
        return { id: user.id, email: user.email, name: user.displayName }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
})
```

### Pattern 2: Drizzle Schema for Auth.js

**What:** Minimal auth tables required by `@auth/drizzle-adapter` plus Phase 1 custom columns.
**When to use:** All table definitions live in `src/lib/db/schema.ts`.

```typescript
// src/lib/db/schema.ts
// Source: https://authjs.dev/reference/drizzle-adapter/lib/pg + Auth.js database models docs
import {
  pgTable, text, timestamp, primaryKey, integer
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),                          // Phase 1: credentials
  displayName: text("display_name"),                   // D-02: for creator attribution
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}))

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))

// Phase 1 custom: password reset tokens (not an Auth.js table)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})
```

### Pattern 3: Route Protection with proxy.ts

**What:** `proxy.ts` at project root runs on every request, redirects unauthenticated users from protected routes.
**When to use:** All route protection — never rely on page-level redirects alone.

```typescript
// proxy.ts (Next.js 16 naming)
// Source: https://nextjs.org/docs/app/guides/authentication (version 16.2.6)
import { NextRequest, NextResponse } from "next/server"
import { decrypt } from "@/lib/session"
import { cookies } from "next/headers"

const protectedRoutes = ["/dashboard", "/courses", "/create"]
const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password"]

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(r => path.startsWith(r))
  const isPublicRoute = publicRoutes.some(r => path === r || path.startsWith(r))

  const cookie = (await cookies()).get("session")?.value
  const session = await decrypt(cookie)

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isPublicRoute && session?.userId && !path.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
}
```

### Pattern 4: Password Reset Flow (Custom — required for Credentials)

**What:** Two Server Actions + one email + one extra DB table. Auth.js does NOT provide this for credentials users.
**When to use:** Whenever user clicks "Forgot password."

```
Step 1: User submits email on /forgot-password
  → Server Action: requestPasswordReset(email)
    1. Check user exists
    2. Delete any existing token for this email
    3. Generate token: crypto.randomBytes(32).toString('hex')
    4. Insert into password_reset_tokens with 1-hour expiry
    5. Send email via Resend with link: /reset-password?token=<token>

Step 2: User clicks link, visits /reset-password?token=<token>
  → Server Action: applyPasswordReset(token, newPassword)
    1. Find token in password_reset_tokens
    2. Check token not expired
    3. Hash new password with bcryptjs
    4. Update users.password
    5. Delete token (single-use)
    6. Redirect to /login
```

### Pattern 5: Sign-Up Server Action

**What:** Server Action validates input with Zod, hashes password, inserts user, creates session.
**When to use:** Form submission from `/signup`.

```typescript
// src/actions/auth.ts
// Source: https://nextjs.org/docs/app/guides/authentication (Next.js 16.2.6 official docs)
'use server'
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { signIn } from "@/lib/auth"
import { SignupSchema } from "@/lib/definitions"

export async function signup(state: FormState, formData: FormData) {
  const validated = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }
  const { email, password } = validated.data
  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    await db.insert(users).values({ email, password: hashedPassword })
  } catch (e) {
    // Handle unique email constraint
    return { message: "Email already in use." }
  }

  // Sign in immediately after signup
  await signIn("credentials", { email, password, redirectTo: "/dashboard" })
}
```

### Pattern 6: Route Handler for Auth.js

```typescript
// src/app/api/auth/[...nextauth]/route.ts
// Source: https://authjs.dev/getting-started/installation
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

### Anti-Patterns to Avoid

- **Using `bcrypt` (not `bcryptjs`):** The native `bcrypt` package requires C++ bindings and fails on Vercel serverless and edge runtimes. Always use `bcryptjs`.
- **Putting auth logic in `layout.tsx`:** Next.js layouts do not re-run on navigation — auth checks here miss subsequent route changes. Put session checks in `proxy.ts` and in individual page/Server Component DAL calls.
- **Assuming Auth.js handles password reset for Credentials users:** It does not. You must build the token table and reset Server Actions manually.
- **Calling `signIn` from the client:** `signIn` from Auth.js v5 should be called from Server Actions. Client-side calls expose session creation logic.
- **Using `getServerSession` (Auth.js v4 API):** In v5, use `await auth()` imported from `@/lib/auth`.
- **Using `pages/` router patterns:** This project is App Router only. Auth.js v4 `pages/` patterns do not apply.
- **Storing passwords in the `accounts` table:** Credentials passwords go in `users.password`. The `accounts` table is for OAuth provider tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Manual HMAC | `jose` (SignJWT, jwtVerify) | Edge-compatible, handles algorithm safety, exp validation |
| Password hashing | SHA-256 or MD5 | `bcryptjs` | bcrypt has built-in work factor (salt rounds); SHA-256 is not password-appropriate |
| Session cookie management | Manual cookie headers | Next.js `cookies()` API + Auth.js session | Handles HttpOnly, Secure, SameSite, path correctly |
| Form validation | Custom regex checks | `zod` with `.safeParse()` | Produces typed error objects compatible with `useActionState` |
| Route protection logic | `if (!session) redirect()` in every page | `proxy.ts` centralized | Pages router has multiple entry points; middleware is the only reliable gate |
| Email sending | SMTP + nodemailer config | Resend SDK | Locked in CLAUDE.md; simpler API, React template support, free tier |
| Auth session management | Custom JWT tables | Auth.js v5 JWT strategy | Handles token refresh, cookie lifecycle, and CSRF correctly |

**Key insight:** The only custom code this phase truly requires is the password reset flow (token table + two Server Actions + one Resend call). Everything else — session management, credentials validation, route protection — is handled by the Auth.js + Next.js combination.

---

## Common Pitfalls

### Pitfall 1: proxy.ts vs middleware.ts naming in Next.js 16

**What goes wrong:** Developer creates `middleware.ts` (the Next.js 15 name), which still works but conflicts with Next.js 16 official patterns. Auth.js v5 docs export `auth as proxy` specifically targeting `proxy.ts`.
**Why it happens:** Most online tutorials are written for Next.js 14/15 and reference `middleware.ts`.
**How to avoid:** Use `proxy.ts` as the file name. Export the function as `proxy` (default). The Auth.js v5 pattern is `export { auth as proxy } from "@/lib/auth"`.
**Warning signs:** Build warnings about deprecated middleware exports; route protection behaving inconsistently on initial page load.

### Pitfall 2: Auth.js Credentials + Drizzle adapter — passwords not persisted by adapter

**What goes wrong:** The Drizzle adapter's `createUser` callback does not receive the password field. Credentials entered during sign-up are processed by `authorize()`, but if you call Auth.js `signIn` for the initial sign-up, the password never reaches the database.
**Why it happens:** Auth.js is designed for OAuth flows where passwords don't exist. The adapter creates users without password fields.
**How to avoid:** Sign-up MUST be a custom Server Action that manually inserts the user into the `users` table with a hashed password BEFORE calling `signIn`. Do NOT rely on Auth.js to create the user during credentials sign-in.
**Warning signs:** Users can't log in after signup because `users.password` is NULL.

### Pitfall 3: bcrypt vs bcryptjs in Edge/Serverless environments

**What goes wrong:** `bcrypt` package is installed (not `bcryptjs`), build succeeds locally but Vercel deployment fails with "cannot find native bindings."
**Why it happens:** `bcrypt` uses a Node.js C++ addon that Vercel serverless functions and Edge Runtime cannot load.
**How to avoid:** Always use `bcryptjs`. Double-check `package.json` after install. The APIs are identical (`bcrypt.hash` → `bcryptjs.hash`).
**Warning signs:** `Error: Cannot find module '../build/Release/bcrypt_lib'` in Vercel logs.

### Pitfall 4: JWT session — user data becomes stale

**What goes wrong:** User updates their email or display_name, but the JWT session cookie still contains the old values for up to 7 days.
**Why it happens:** JWT sessions are stateless — the cookie is not re-issued on every request unless explicitly refreshed.
**How to avoid:** In Phase 1, user profile editing is out of scope, so this is acceptable. Document as a known limitation for future phases. If needed, the `jwt` callback can re-fetch from DB on each request (adds latency).
**Warning signs:** Dashboard shows stale display names after a profile update.

### Pitfall 5: Redirect loop on protected routes

**What goes wrong:** Authenticated users visiting `/login` get redirected to `/dashboard`, which redirects back to `/login` if the session check fails for any reason.
**Why it happens:** Overly broad proxy logic that redirects authenticated users away from all public routes unconditionally, combined with a failing session decrypt.
**How to avoid:** Test the redirect logic explicitly: authenticated user on `/login` → `/dashboard`, unauthenticated user on `/dashboard` → `/login`. Verify session decrypt returns null gracefully (try/catch in `decrypt()`).
**Warning signs:** Browser shows "Too many redirects" error on login page.

### Pitfall 6: AUTH_SECRET not set in production

**What goes wrong:** Sessions created in development cannot be verified in production (or vice versa), causing all users to appear unauthenticated after deployment.
**Why it happens:** `AUTH_SECRET` is the signing key for JWT sessions. If it differs between environments or is missing, all session cookies are invalid.
**How to avoid:** Generate with `npx auth secret` and add to Vercel environment variables before first deploy. Never commit `.env.local` to git.
**Warning signs:** Users logged out immediately after every deployment.

### Pitfall 7: Zod v4 API changes

**What goes wrong:** Code copied from tutorials uses `z.string().email()` with message option as `{ message: "..." }` but Zod v4 (currently at 4.4.3) changed the error option key to `{ error: "..." }` for some validators.
**Why it happens:** Zod v4 shipped breaking changes to the error option format in some validators.
**How to avoid:** Use the Next.js official docs example pattern which shows the v4-compatible `{ error: "..." }` format. When in doubt, use `.refine()` with a message string.
**Warning signs:** Zod schema silently ignores custom error messages; TypeScript type errors on `.error` vs `.message`.

---

## Code Examples

Verified patterns from official sources:

### Neon + Drizzle DB Client

```typescript
// src/lib/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

### drizzle.config.ts

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Session Encrypt/Decrypt with jose

```typescript
// src/lib/session.ts
// Source: https://nextjs.org/docs/app/guides/authentication (Next.js 16.2.6)
import "server-only"
import { SignJWT, jwtVerify } from "jose"

const secretKey = process.env.AUTH_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: { userId: string; expiresAt: Date }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    })
    return payload
  } catch {
    return null
  }
}
```

### Resend Email for Password Reset

```typescript
// src/lib/mail.ts
import { Resend } from "resend"
import PasswordResetEmail from "@/emails/reset-password"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: "YouCourse <noreply@youcourse.app>",
    to: email,
    subject: "Reset your YouCourse password",
    react: PasswordResetEmail({ resetUrl }),
  })
}
```

### Zod Auth Schemas (v4 compatible)

```typescript
// src/lib/definitions.ts
// Source: https://nextjs.org/docs/app/guides/authentication (Next.js 16.2.6)
import { z } from "zod"

export const SignupSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .trim(),
})

export const LoginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
})

export type FormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string }
  | undefined
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 | File must be named `proxy.ts`; Auth.js exports `auth as proxy` |
| `getServerSession(authOptions)` | `await auth()` (no args) | Auth.js v5 | Import `auth` from your config file; no options object needed |
| `import { default } from "next-auth/middleware"` | `export { auth as proxy } from "@/auth"` | Auth.js v5 | Route protection is now the auth function directly |
| NextAuth options object passed everywhere | Single `NextAuth()` call, named exports | Auth.js v5 | All consumers import `{ auth, signIn, signOut, handlers }` from one file |
| `useSession()` in Server Components | `await auth()` in Server Components | Auth.js v5 | `useSession` is client-only; server-side reads use `auth()` |
| Tailwind CSS `postcss.config.js` with autoprefixer | Tailwind v4 CSS-first, no postcss config needed | Tailwind v4 (Jan 2025) | Remove separate postcss/autoprefixer setup |

**Deprecated/outdated:**

- `next-auth@4` (stable): Uses `pages/` router patterns; `getServerSession` API; different session cookie shape. Many Stack Overflow answers and tutorials reference v4 — they do NOT apply to this project.
- `middleware.ts` as the proxy file name: Still supported in Next.js 16 for backwards compatibility but official docs and new projects use `proxy.ts`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | v24.15.0 | — |
| npm | Package management | ✓ | 11.13.0 | — |
| npx | create-next-app scaffold | ✓ | bundled with npm | — |
| PostgreSQL (local) | DB dev | ✗ | — | Use Neon free tier (cloud) |
| Neon account | Database host | Not verified | — | Must create at neon.tech before Phase 1 execution |
| Resend account | Email sending | Not verified | — | Must create at resend.com; use `onboarding@resend.dev` sender for dev until domain verified |

**Missing dependencies with no fallback:**
- Neon account + DATABASE_URL: Must be provisioned before `drizzle-kit push` can run. Plan must include a "Provision Neon database" step.
- Resend API key: Must be created before password reset email can be sent.
- `AUTH_SECRET`: Must be generated via `npx auth secret` before any Auth.js session works.

**Missing dependencies with fallback:**
- Local PostgreSQL: Neon free tier is the intended dev environment. No local install needed.

---

## Open Questions

1. **Resend sender domain verification**
   - What we know: Resend free tier allows sending from `onboarding@resend.dev` without domain verification.
   - What's unclear: Whether the project has a custom domain to verify for production-quality "from" addresses.
   - Recommendation: Use `onboarding@resend.dev` as sender during Phase 1 development. Document domain verification as a pre-launch step.

2. **`proxy.ts` vs `middleware.ts` — final confirmation for Auth.js v5 + Next.js 16**
   - What we know: Next.js 16 official docs use `proxy.ts` with `proxy` as the default export name. Auth.js docs reference both naming conventions depending on framework version.
   - What's unclear: Whether `@auth/drizzle-adapter` middleware helper requires `middleware.ts` specifically.
   - Recommendation: Use `proxy.ts` with custom `proxy` function (not the Auth.js `auth` export directly) so the logic for specific route matching (D-09) can be written explicitly. This is the pattern from the official Next.js 16 auth docs.

3. **Zod v4 `z.email()` API**
   - What we know: Zod 4.4.3 is the current version. The Next.js 16 official docs show `z.email({ error: "..." })` (not `z.string().email()`).
   - What's unclear: Whether `z.email()` is a top-level method in Zod v4 or if it's accessed as `z.string().email()`.
   - Recommendation: Use the Next.js official docs pattern verbatim. If `z.email()` produces TypeScript errors, fall back to `z.string().email({ message: "..." })` which is the v3 API that still works in v4.

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs v16.2.6 (lastUpdated 2026-05-28) — `https://nextjs.org/docs/app/guides/authentication` — authentication patterns, Server Actions, proxy.ts route protection, session management with jose, Zod form validation
- Auth.js installation docs — `https://authjs.dev/getting-started/installation` — package install, file structure, AUTH_SECRET generation
- Auth.js credentials provider — `https://authjs.dev/getting-started/authentication/credentials` — authorize function signature, CredentialsSignin error class
- Auth.js Drizzle adapter — `https://authjs.dev/getting-started/adapters/drizzle` — adapter setup, required tables, custom table override pattern
- Auth.js protecting routes — `https://authjs.dev/getting-started/session-management/protecting` — proxy.ts authorized callback, matcher config
- Auth.js database models — `https://authjs.dev/concepts/database-models` — User, Account, Session, VerificationToken column descriptions
- Drizzle ORM + Neon setup — `https://orm.drizzle.team/docs/get-started/neon-new` — `drizzle-orm/neon-http` import, db client setup, drizzle.config.ts
- Resend Next.js docs — `https://resend.com/docs/send-with-nextjs` — SDK install, API route pattern, React email templates

### Secondary (MEDIUM confidence)

- Auth.js v5 Drizzle adapter PostgreSQL reference — `https://authjs.dev/reference/drizzle-adapter/lib/pg` — column type summary (page did not render full code; column names confirmed via Auth.js database models doc)
- NailedIt password reset guide — `https://nailedit.vercel.app/articles/how-to-enable-password-reset` — custom password_reset_tokens schema pattern, two-step Server Action flow
- WebSearch: bcryptjs vs bcrypt edge runtime (multiple sources confirm bcryptjs is required for Vercel/edge)

### Tertiary (LOW confidence)

- WebSearch: Auth.js v5 + Next.js 16 complete guide 2026 (DEV Community article) — confirmed Prisma was used in that guide, not Drizzle; Drizzle schema derived from official adapter docs instead

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified against npm registry on 2026-05-30; library choices locked in CLAUDE.md
- Architecture: HIGH — proxy.ts pattern and Server Action pattern taken directly from Next.js 16.2.6 official docs (dated 2026-05-28)
- Pitfalls: HIGH for bcryptjs/proxy.ts/password-not-persisted (verified via official docs); MEDIUM for Zod v4 API (based on official docs pattern but z.email() top-level method not independently confirmed in Zod changelog)
- Password reset custom flow: MEDIUM — pattern is consistent across multiple community sources but Auth.js does not document it officially

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (Auth.js beta moves fast; re-verify next-auth@beta version before execution)
