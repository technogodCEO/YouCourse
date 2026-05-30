---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [password-reset, resend, email, server-actions, auth-03]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [password-reset-flow, resend-mailer]
  affects: [auth-system]
tech_stack:
  added: [resend@6.x]
  patterns: [server-actions-useActionState, email-template-inline-styles, single-use-token]
key_files:
  created:
    - src/emails/reset-password.tsx
    - src/lib/mail.ts
    - src/actions/password-reset.ts
    - src/components/auth/forgot-password-form.tsx
    - src/components/auth/reset-password-form.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
  modified: []
decisions:
  - "Token TTL is 1 hour (60*60*1000 ms) — single active token per email (prior tokens deleted on new request)"
  - "Resend sender is onboarding@resend.dev for dev; must swap to verified domain pre-launch (RESEARCH Open Q1)"
  - "Email existence non-leak: requestPasswordReset always returns the same success-style message regardless of whether the account exists"
  - "Next.js 16 searchParams is a Promise — reset-password page uses 'const { token } = await searchParams'"
  - "applyPasswordReset uses bcrypt cost factor 12 — consistent with signup action"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-30T17:34:35Z"
  tasks_completed: 3
  tasks_total: 4
  files_created: 7
  files_modified: 0
---

# Phase 01 Plan 03: Password Reset Flow Summary

**One-liner:** Single-use 1-hour token password reset via Resend email with `requestPasswordReset` / `applyPasswordReset` Server Actions and branded forgot/reset pages.

## What Was Built

AUTH-03 password reset flow — the only Phase 1 requirement Auth.js does not provide out of the box for Credentials users. The implementation is a bespoke token-table flow built on the `passwordResetTokens` table from Plan 01.

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| Email template | `src/emails/reset-password.tsx` | Branded HTML email with inline styles (navy bg, accent CTA button), accepts `resetUrl` prop |
| Mailer | `src/lib/mail.ts` | `sendPasswordResetEmail(email, token)` — constructs tokenized URL, sends via Resend |
| Server Actions | `src/actions/password-reset.ts` | `requestPasswordReset` + `applyPasswordReset` |
| ForgotPasswordForm | `src/components/auth/forgot-password-form.tsx` | `'use client'`, `useActionState(requestPasswordReset)`, email input + success alert |
| ResetPasswordForm | `src/components/auth/reset-password-form.tsx` | `'use client'`, `useActionState(applyPasswordReset)`, hidden token + password + error states |
| /forgot-password page | `src/app/(auth)/forgot-password/page.tsx` | Server Component — heading, helper text, ForgotPasswordForm, link to /login |
| /reset-password page | `src/app/(auth)/reset-password/page.tsx` | Server Component — awaits searchParams, renders form or invalid-token message |

## Key Design Decisions

### Token TTL and Single-Use Enforcement
- TTL: 1 hour (`Date.now() + 60 * 60 * 1000`)
- Single active token per email: existing tokens deleted before generating a new one
- Single-use: token deleted immediately after successful password update (step 5 in `applyPasswordReset`)
- Expiry check: `gt(passwordResetTokens.expires, new Date())` — only non-expired tokens accepted

### Resend Sender (Dev vs Verified Domain)
- Dev: `onboarding@resend.dev` — Resend's shared dev domain, delivers to real addresses for testing
- Pre-launch action required: swap `from` in `src/lib/mail.ts` to a verified custom domain (RESEARCH Open Q1)
- This is documented in a comment in `mail.ts`

### Email Existence Non-Leak (Security)
`requestPasswordReset` always returns the same success-style message:
```
"Check your inbox — we sent a reset link to {email}."
```
No separate branch surfaces "email not found" — email enumeration attack is prevented. The email is only generated and sent when the user actually exists in the database.

### Next.js 16 searchParams-as-Promise
The `/reset-password` page uses the Next.js 16 async searchParams pattern:
```typescript
interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams
```
This is required in Next.js App Router v16 where searchParams is a Promise, not a synchronous object.

## Deviations from Plan

### Auto-added: email-client compatible inline styles
The React email template was built with inline styles as required for email clients (no Tailwind classes). Used the accent solid `#F05A2A` for the button background instead of the full gradient — email clients have poor gradient support.

No other deviations — plan executed as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: token-enumeration | src/actions/password-reset.ts | MITIGATED — same message returned regardless of email existence |
| threat_flag: token-reuse | src/actions/password-reset.ts | MITIGATED — token deleted after use; expiry enforced with gt() |

## Pending Human Verification (Task 4)

Task 4 is a `checkpoint:human-verify` requiring end-to-end testing with a live Resend email delivery. See PLAN.md Task 4 `<how-to-verify>` for the 7-step verification checklist.

**Status:** Awaiting human verification. All implementation tasks (1-3) are committed.

## Self-Check

### Files Created

- [x] `src/emails/reset-password.tsx` — FOUND
- [x] `src/lib/mail.ts` — FOUND
- [x] `src/actions/password-reset.ts` — FOUND
- [x] `src/components/auth/forgot-password-form.tsx` — FOUND
- [x] `src/components/auth/reset-password-form.tsx` — FOUND
- [x] `src/app/(auth)/forgot-password/page.tsx` — FOUND
- [x] `src/app/(auth)/reset-password/page.tsx` — FOUND

### Commits

- [x] `77f185e` — feat(01-03): build Resend mailer and React email template
- [x] `4600c25` — feat(01-03): implement requestPasswordReset and applyPasswordReset Server Actions
- [x] `2cc297a` — feat(01-03): build forgot-password and reset-password pages with client forms

## Self-Check: PASSED
