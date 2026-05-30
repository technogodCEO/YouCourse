---
phase: 01-foundation
plan: 01
subsystem: auth-foundation
tags: [scaffold, drizzle, auth, nextjs, schema, jwt]
dependency_graph:
  requires: []
  provides:
    - src/lib/db/schema.ts (users, accounts, verificationTokens, passwordResetTokens)
    - src/lib/db/index.ts (drizzle neon-http db client)
    - src/lib/auth.ts (handlers, signIn, signOut, auth)
    - src/lib/session.ts (encrypt, decrypt)
    - src/lib/definitions.ts (SignupSchema, LoginSchema, FormState)
    - src/lib/dal.ts (verifySession, getUser)
  affects:
    - All Phase 1 Wave 2 plans (01-02, 01-03) import from these modules
    - Phase 2+ imports db client and schema for Drizzle additions
tech_stack:
  added:
    - next@16.2.6
    - next-auth@5.0.0-beta.31
    - "@auth/drizzle-adapter@1.11.2"
    - drizzle-orm@0.45.2
    - "@neondatabase/serverless@1.1.0"
    - drizzle-kit@0.31.10
    - bcryptjs@3.0.3
    - resend@6.12.4
    - zod@4.4.3
    - jose@6.2.3
    - server-only
  patterns:
    - NextAuth v5 JWT strategy with Credentials provider
    - Drizzle ORM with neon-http driver (build-safe initialization)
    - server-only guard on dal.ts and session.ts
    - jose SignJWT/jwtVerify for session encryption
    - Zod v4 schema validation with z.string().email() (v3 API, still works in v4)
key_files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/auth.ts
    - src/lib/session.ts
    - src/lib/definitions.ts
    - src/lib/dal.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/types/next-auth.d.ts
    - drizzle.config.ts
    - .env.example
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - package.json
    - next.config.ts
decisions:
  - "Used z.string().email() (Zod v3 API) instead of z.email() — TypeScript confirmed both work in zod@4.4.3 but z.string().email() is safer for compatibility"
  - "db/index.ts uses neon() with placeholder fallback so build succeeds without DATABASE_URL at static analysis phase"
  - "Scaffolded via temp directory (youcourse-tmp) since project root was non-empty; moved files manually preserving CLAUDE.md, LICENSE, .planning, public/images"
  - "turbopack.root set in next.config.ts to silence workspace root detection warning"
metrics:
  duration_seconds: 487
  completed_date: "2026-05-30"
  tasks_completed: 4
  tasks_total: 4
  files_created: 14
  files_modified: 4
---

# Phase 1 Plan 1: Foundation Scaffold Summary

**One-liner:** Next.js 16 App Router scaffolded with Drizzle schema (4 auth tables), Auth.js v5 JWT credentials config, jose session helpers, Zod definitions, server-only DAL, and brand-themed root layout — all contract modules ready for Wave 2 consumption.

## Objective

Establish the complete shared foundation that both auth feature plans (sign-up/login and password reset) depend on: the Drizzle schema, the Neon DB client, the Auth.js v5 configuration, the jose session helpers, the Zod definitions, and the data access layer.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Scaffold Next.js 16 + install all auth/DB dependencies | fff3288 | Complete |
| 2 | Define Drizzle schema, DB client, config, env template | 8d94dbd | Complete |
| 3 | Auth.js config, session helpers, Zod defs, DAL, route handler, root layout | 2bcc489 | Complete |
| 4 | Provision Neon + Resend, supply env vars, push schema, verify build | human-verified | Complete |

## Contract Module Exports

### src/lib/db/schema.ts
```typescript
export const users           // { id, name, email, emailVerified, image, password, displayName, createdAt }
export const accounts        // OAuth adapter table (provider/providerAccountId compound PK)
export const verificationTokens  // { identifier, token, expires }
export const passwordResetTokens // { id, email, token, expires }
```

### src/lib/db/index.ts
```typescript
export const db   // drizzle(neon-http) client with schema bound
```

### src/lib/auth.ts
```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({ ... })
```

### src/lib/session.ts
```typescript
export async function encrypt(payload: { userId: string; expiresAt: Date }): Promise<string>
export async function decrypt(session?: string): Promise<{ userId: string } | null>
```

### src/lib/definitions.ts
```typescript
export const SignupSchema   // z.object({ email: string, password: min 8 })
export const LoginSchema    // z.object({ email: string, password: min 1 })
export type FormState = { errors?: { email?: string[]; password?: string[] }; message?: string } | undefined
```

### src/lib/dal.ts
```typescript
export async function verifySession(): Promise<{ isAuth: true; userId: string }>  // redirects to /login if no session
export async function getUser(): Promise<User | null>
```

## Environment Variables Required

| Variable | Source | Status |
|----------|--------|--------|
| `DATABASE_URL` | Neon Console -> Project -> Connection Details (pooled) | Present in .env.local |
| `AUTH_SECRET` | Generated via openssl rand -base64 32 | Present in .env.local |
| `RESEND_API_KEY` | Resend Dashboard -> API Keys | Present in .env.local |
| `NEXT_PUBLIC_APP_URL` | Set to http://localhost:3000 for dev | Present in .env.local |

## Scaffold Approach

Used **temp directory approach** since the project root already contained `.git`, `CLAUDE.md`, `LICENSE`, `README.md`, `.planning/`, and `public/images/YouCourseLogo.png`.

Steps taken:
1. `npx create-next-app@latest youcourse-tmp` with TypeScript, Tailwind v4, ESLint, App Router, Turbopack flags
2. Copied `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore` to project root
3. Copied public SVGs from temp but NOT `public/images/` (preserved existing `YouCourseLogo.png`)
4. Removed temp directory; ran `npm install` fresh to rebuild node_modules

## Installed Versions

| Package | Version |
|---------|---------|
| next | 16.2.6 |
| next-auth | ^5.0.0-beta.31 |
| @auth/drizzle-adapter | ^1.11.2 |
| drizzle-orm | ^0.45.2 |
| @neondatabase/serverless | ^1.1.0 |
| drizzle-kit | ^0.31.10 |
| bcryptjs | ^3.0.3 |
| resend | ^6.12.4 |
| zod | ^4.4.3 |
| jose | ^6.2.3 |
| server-only | ^0.0.1 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Build failure without DATABASE_URL at static analysis phase**
- **Found during:** Task 3 build verification
- **Issue:** `drizzle(process.env.DATABASE_URL!, { schema })` throws during `next build`'s static analysis phase because DATABASE_URL is not set at build time. The DrizzleAdapter in auth.ts calls `db.query` which fails when the db instance is invalid.
- **Fix:** Changed `db/index.ts` to use `neon()` with a `?? "placeholder"` fallback string, so the drizzle instance is always valid structurally even without a real DATABASE_URL. At runtime, a missing DATABASE_URL will throw the first time a query is made (correct behavior).
- **Files modified:** `src/lib/db/index.ts`
- **Commit:** 2bcc489

**2. [Rule 2 - Missing functionality] .env.example blocked by .gitignore**
- **Found during:** Task 2 commit
- **Issue:** The create-next-app `.gitignore` pattern `.env*` blocked committing `.env.example`.
- **Fix:** Added `!.env.example` exception to `.gitignore` so the template is committed (it contains no secrets — only placeholder values).
- **Files modified:** `.gitignore`
- **Commit:** 8d94dbd

**3. [Rule 3 - Blocking] Turbopack workspace root warning**
- **Found during:** Task 3 build
- **Issue:** Next.js detected multiple lockfiles and issued a warning about workspace root detection.
- **Fix:** Added `turbopack: { root: __dirname }` to `next.config.ts` to silence the warning.
- **Files modified:** `next.config.ts`
- **Commit:** 2bcc489

**4. [Rule 1 - Deviation] Zod z.email() API**
- **Found during:** Task 3 implementation
- **Issue:** The plan specified `z.email({ error: "..." })` as the primary pattern. Used `z.string().email({ message: "..." })` instead — the v3-compatible API that works reliably in both Zod v3 and v4.
- **Fix:** Used the safer `z.string().email()` pattern per the plan's own fallback note.
- **Files modified:** `src/lib/definitions.ts`
- **Commit:** 2bcc489

## Known Stubs

None — this plan creates infrastructure modules only, no UI or data rendering.

## Self-Check: PASSED

All created files verified to exist. All commits verified in git log.

- FOUND: src/lib/db/schema.ts
- FOUND: src/lib/db/index.ts
- FOUND: src/lib/auth.ts
- FOUND: src/lib/session.ts
- FOUND: src/lib/definitions.ts
- FOUND: src/lib/dal.ts
- FOUND: .planning/phases/01-foundation/01-01-SUMMARY.md
- FOUND commit: fff3288 (Task 1)
- FOUND commit: 8d94dbd (Task 2)
- FOUND commit: 2bcc489 (Task 3)

## Task 4: Checkpoint Verification (Complete)

Human-verified 2026-05-30. All steps confirmed:
1. Neon project created; pooled connection string added to `.env.local`
2. Resend account provisioned; API key added to `.env.local`
3. `DATABASE_URL`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET` all present in `.env.local`
4. `npx drizzle-kit push` created 4 tables in Neon: users, accounts, verification_tokens, password_reset_tokens
5. `npm run build` passed: Next.js 16.2.6 compiled successfully, zero TypeScript errors
6. Dev server renders dark `#0D1B2A` background at localhost:3000
