# Phase 1: Foundation - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers: Next.js project scaffold, Drizzle/Neon database setup with auth tables, and working email/password authentication (sign-up, login, password reset) with JWT sessions and middleware-based route protection.

**In scope:** Project init, auth schema, Auth.js v5 email/password flow, Resend email integration, `/dashboard` protected route, `/login` + `/signup` + `/forgot-password` public pages.

**Not in scope:** Course, video, question, or progress tables (Phase 2+). OAuth/social login (out of scope for v1). Catalog browsing (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Database Schema
- **D-01:** Phase 1 creates auth tables only — `users`, `accounts`, `verification_tokens`. No course/video/question/progress tables yet; those ship with the phases that build those subsystems.
- **D-02:** The `users` table includes a nullable `display_name` column. Rationale: course creator attribution is needed by Phase 4 (catalog); adding it now avoids a migration.
- **D-03:** Schema managed via Drizzle ORM with `drizzle-kit`. Use `@neondatabase/serverless` driver for Neon.

### Post-Auth Landing
- **D-04:** After sign-up and login, redirect users to `/dashboard`. Placeholder content is acceptable in Phase 1 — the dashboard will fill in as later phases deliver courses and progress.

### Email Provider
- **D-05:** Use **Resend** for password reset emails. Free tier (3,000 emails/mo), native Auth.js/Next.js integration. Requires a Resend account and API key in env.
- **D-06:** Auth.js v5's built-in email adapter wires to Resend — no custom mailer needed.

### Session Strategy
- **D-07:** JWT stateless sessions (Auth.js default). Session encoded in a signed httpOnly cookie — no sessions table required. Edge-compatible. Acceptable for v1 since forced server-side session revocation is not a v1 requirement.

### Route Protection
- **D-08:** Use `middleware.ts` (Auth.js v5 middleware export) for centralized route protection. Runs at the edge before any page renders.
- **D-09:** Protected matcher: `/dashboard` and any future `/courses/*`, `/create/*` routes. Public routes: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- **D-10:** Unauthenticated access to a protected route redirects to `/login`.

### Claude's Discretion
- Page layout/styling within Tailwind v4 — standard clean auth UI is fine; no specific design reference given.
- Exact Drizzle schema column types (text vs varchar, timestamp precision) — use sensible Postgres defaults.
- Error handling UX on auth forms (inline field errors vs toast) — standard pattern is acceptable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack & Conventions
- `CLAUDE.md` — Full technology stack decisions, version constraints, what NOT to use, and installation patterns. Required reading before any scaffolding decisions.

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-04 are the acceptance criteria for this phase. Traceability table maps each to Phase 1.
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (4 items) define exactly what must be true at phase end.

### No external specs
No ADRs or external design docs yet — all decisions captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a greenfield project. Phase 1 creates the foundation all future phases build on.

### Established Patterns
- None yet — this phase establishes the patterns (Drizzle schema conventions, App Router structure, auth session access) that later phases will follow.

### Integration Points
- Phase 1 output is consumed by every subsequent phase: session identity (user ID from JWT) is needed by Phase 2 ingestion, Phase 3 creation UI, and Phase 4 learner flow.
- Drizzle `db` client and schema exports established in Phase 1 are imported directly by Phase 2 schema additions.

</code_context>

<specifics>
## Specific Ideas

- No specific design references given — standard clean auth UI is acceptable.
- Stack already fully specified in `CLAUDE.md` — researcher should not re-evaluate library choices already locked in.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-05-30*
