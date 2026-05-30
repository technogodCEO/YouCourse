# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 01-foundation
**Areas discussed:** Database schema scope, Email provider, Session strategy, Route protection pattern

---

## Database Schema Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Auth tables only | Create only users, accounts, verification_tokens in Phase 1 | ✓ |
| Full v1 schema now | Scaffold all tables (courses, videos, questions, enrollments, progress) upfront | |
| Auth + core relations skeleton | Auth tables + stub tables with IDs/FKs only | |

**User's choice:** Auth tables only (recommended)
**Notes:** Keeping Phase 1 focused; other tables added when those subsystems are built.

---

### Post-auth landing destination

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard / home page | Redirect to /dashboard after sign-up or login | ✓ |
| Catalog page | Drop users into /catalog directly | |
| You decide | Let Claude choose | |

**User's choice:** Dashboard / home page
**Notes:** Placeholder content acceptable in Phase 1.

---

### Users table fields

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password only | Minimal auth schema | |
| Include display_name | Add nullable display_name column | ✓ |
| You decide | Claude picks | |

**User's choice:** Include display_name
**Notes:** Needed for course creator attribution in Phase 4 catalog; avoid migration later.

---

## Email Provider

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Modern API-first, free tier, native Auth.js integration | ✓ |
| Nodemailer + SMTP | Any SMTP server, more config | |
| Skip email for now | Console-log token in dev, wire later | |

**User's choice:** Resend
**Notes:** Requires Resend account and API key in env.

---

## Session Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| JWT stateless sessions | Auth.js default, no extra table, edge-compatible | ✓ |
| Database-backed sessions | Sessions table, enables server-side revocation | |

**User's choice:** JWT stateless sessions (recommended)
**Notes:** Server-side revocation not a v1 requirement.

---

## Route Protection Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| middleware.ts | Centralized edge middleware, Auth.js v5 native | ✓ |
| Layout-level guards | Per-route getServerSession calls | |

**User's choice:** middleware.ts (recommended)

---

### Protected vs public routes

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only | /dashboard (and future /courses/*, /create/*) protected; rest public | ✓ |
| Everything except auth pages | Lock entire app behind auth | |

**User's choice:** Dashboard only
**Notes:** Ensures catalog (Phase 4) can be browsed anonymously as planned in v2 requirements.

---

## Claude's Discretion

- Page layout/styling for auth pages — standard Tailwind v4 clean UI
- Drizzle schema column types — sensible Postgres defaults
- Form error handling UX — inline errors vs toast, standard pattern acceptable

## Deferred Ideas

None — discussion stayed within phase scope.
