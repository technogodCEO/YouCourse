# UI-BRAND.md — YouCourse

**Status:** locked
**Last updated:** 2026-05-30
**Source of truth:** `public/images/YouCourseLogo.png` logo color palette

---

## 1. Brand Identity & Tagline

### Product name
YouCourse (mixed case, one word — never "Youcourse", "you course", or "YOUCOURSE")

### Personality
Sharp, modern, dark-first. This is a serious learner tool — not edutainment, not a social feed. The aesthetic is technical and focused: closer to a developer tool or professional SaaS than a consumer education platform. Every visual choice should communicate deliberate structure and forward momentum.

### Tagline
**"Construct your mind"**

Rationale: The core value is provable comprehension. The tagline is short (3 words), confident, and memorable. Pair with the sub-tagline "Not just views — verified understanding." on marketing surfaces.

Alternative tagline (secondary use): **"Watch. Prove. Progress."** — for in-product empty states or onboarding surfaces.

---

## 2. Color System

### Source
All colors derived from direct inspection of `public/images/YouCourseLogo.png`:
- Logo background: deep navy `#0D1B2A`
- Camera body gradient start (left): coral-red `#F03C2E`
- Camera body gradient end (right / fin): orange `#FF7C1F`
- Play triangle + graduation cap: white `#FFFFFF`

### Dark mode (default)

| Role | Token name | Hex | Usage |
|------|-----------|-----|-------|
| Background (60%) | `--bg-base` | `#0D1B2A` | Page background — matches logo background exactly |
| Surface (30%) | `--bg-surface` | `#132233` | Cards, sidebar, nav bar, modals |
| Surface raised | `--bg-surface-raised` | `#1A2E42` | Hover states, dropdowns, nested cards |
| Border | `--border` | `#243B52` | Dividers, input borders, card outlines |
| Text primary | `--text-primary` | `#F0F4F8` | Headings, body text, labels |
| Text secondary | `--text-secondary` | `#8BA3BA` | Captions, placeholder text, metadata |
| Text muted | `--text-muted` | `#4E6A82` | Disabled states, inactive nav items |
| Accent start (10%) | `--accent-from` | `#F03C2E` | Gradient start — coral-red |
| Accent end | `--accent-to` | `#FF7C1F` | Gradient end — orange |
| Accent solid | `--accent-solid` | `#F05A2A` | Single-color fallback (midpoint of gradient) |
| Success | `--success` | `#22C55E` | Correct answer, pass badge, progress complete |
| Destructive | `--destructive` | `#EF4444` | Delete actions, fail badge, error messages |
| Warning | `--warning` | `#F59E0B` | Retry prompts, quota warnings |

### Light mode (toggle)

| Role | Token name | Hex | Usage |
|------|-----------|-----|-------|
| Background (60%) | `--bg-base` | `#F8FAFC` | Page background |
| Surface (30%) | `--bg-surface` | `#FFFFFF` | Cards, nav bar, modals |
| Surface raised | `--bg-surface-raised` | `#F1F5F9` | Hover states, dropdowns |
| Border | `--border` | `#CBD5E1` | Dividers, input borders |
| Text primary | `--text-primary` | `#0D1B2A` | Headings, body — matches logo navy |
| Text secondary | `--text-secondary` | `#475569` | Captions, metadata |
| Text muted | `--text-muted` | `#94A3B8` | Disabled, inactive |
| Accent (unchanged) | same as dark | same as dark | Gradient and solid accent identical in both modes |
| Success / Destructive / Warning | unchanged | unchanged | Semantic colors are mode-invariant |

### The brand gradient
```
background: linear-gradient(to right, #F03C2E, #FF7C1F);
```
Tailwind v4 inline equivalent: `bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F]`

**Reserved for exactly these elements:**
1. Primary CTA buttons (filled)
2. Active step in course progress tracker / stepper
3. Course completion banner background
4. Accent underline on active nav link
5. Brand wordmark highlight when used standalone (without logo image)

Do NOT use the gradient on: text body, backgrounds, borders, badges, icons, secondary buttons, or any passive UI element. The gradient signals action or achievement only.

---

## 3. Typography Scale

### Font family
**Geist** — loaded via `next/font/google` (or Vercel's CDN via `next/font/local` if using the Vercel-hosted variant). Apply to `<html>` via the `className` prop from `next/font`.

```ts
// app/layout.tsx
import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
```

Fallback stack: `ui-sans-serif, system-ui, -apple-system, sans-serif`

### Type scale (4 sizes only)

| Scale name | Size | Line height | Weight | Tailwind classes | Usage |
|-----------|------|-------------|--------|-----------------|-------|
| Display | 28px | 1.2 | 600 | `text-[28px] leading-tight font-semibold` | Page headings, hero headlines |
| Heading | 20px | 1.3 | 600 | `text-[20px] leading-snug font-semibold` | Section headings, card titles, modal titles |
| Body | 16px | 1.5 | 400 | `text-[16px] leading-relaxed font-normal` | All body text, labels, descriptions |
| Caption | 14px | 1.4 | 400 | `text-[14px] leading-normal font-normal` | Metadata, timestamps, helper text, badges |

### Weight usage (2 weights only)
- **Regular (400):** All body text, captions, form fields, nav items, secondary labels
- **Semibold (600):** All headings, CTA button labels, active nav item, badge text, stat numbers

Never use bold (700+) or light (300). Those two weights cover all hierarchy needed.

### Numeric rendering
Use `font-variant-numeric: tabular-nums` on progress percentages, scores, and video duration displays to prevent layout shift.
Tailwind: add `tabular-nums` class.

---

## 4. Spacing System

Base unit: **4px** (Tailwind v4 default — `spacing-1 = 4px`)

All spacing values must be multiples of 4. Use only these steps:

| Step | px | Tailwind token | Use case |
|------|----|---------------|----------|
| 1 | 4px | `p-1` / `gap-1` | Icon internal padding, tight badge padding |
| 2 | 8px | `p-2` / `gap-2` | Between icon and label, chip internal padding |
| 3 | 12px | `p-3` / `gap-3` | Input vertical padding |
| 4 | 16px | `p-4` / `gap-4` | Card internal padding (default), form field spacing |
| 6 | 24px | `p-6` / `gap-6` | Section padding, modal body padding |
| 8 | 32px | `p-8` / `gap-8` | Page section vertical gaps, large card padding |
| 12 | 48px | `p-12` / `gap-12` | Between major page sections |
| 16 | 64px | `p-16` / `gap-16` | Hero vertical padding, auth form vertical centering |

Touch target minimum: **44px tall** for all interactive elements on mobile. Achieve via `min-h-[44px]` on buttons and interactive list items.

---

## 5. Component Primitives

All components are expressed as Tailwind v4 class combinations. No component library.

### Button variants

**Primary CTA (gradient fill)**
```
class="inline-flex items-center justify-center gap-2
       min-h-[44px] px-6 py-3 rounded-lg
       bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F]
       text-white text-[16px] font-semibold leading-none
       shadow-sm
       transition-opacity duration-150
       hover:opacity-90 active:opacity-80
       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A]
       disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
```

**Secondary (outlined)**
```
class="inline-flex items-center justify-center gap-2
       min-h-[44px] px-6 py-3 rounded-lg
       border border-[--border] bg-transparent
       text-[--text-primary] text-[16px] font-semibold leading-none
       transition-colors duration-150
       hover:bg-[--bg-surface-raised]
       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A]
       disabled:opacity-40 disabled:cursor-not-allowed"
```

**Ghost (text-only)**
```
class="inline-flex items-center justify-center gap-2
       min-h-[44px] px-4 py-2 rounded-lg
       bg-transparent text-[--text-secondary] text-[16px] font-normal leading-none
       transition-colors duration-150
       hover:bg-[--bg-surface-raised] hover:text-[--text-primary]
       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A]
       disabled:opacity-40 disabled:cursor-not-allowed"
```

**Destructive**
```
class="inline-flex items-center justify-center gap-2
       min-h-[44px] px-6 py-3 rounded-lg
       bg-[#EF4444]
       text-white text-[16px] font-semibold leading-none
       transition-opacity duration-150
       hover:opacity-90 active:opacity-80
       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF4444]
       disabled:opacity-40 disabled:cursor-not-allowed"
```

**Small variant modifier (add to any button above)**
```
min-h-[36px] px-4 py-2 text-[14px]
```

---

### Input / text field

```
class="w-full min-h-[44px] px-4 py-3 rounded-lg
       bg-[--bg-surface-raised] border border-[--border]
       text-[--text-primary] text-[16px] font-normal leading-relaxed
       placeholder:text-[--text-muted]
       transition-colors duration-150
       focus:outline-none focus:border-[#F05A2A] focus:ring-1 focus:ring-[#F05A2A]/30
       disabled:opacity-50 disabled:cursor-not-allowed"
```

**Field error state (add to the input)**
```
border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/30
```

**Field label**
```
class="block text-[14px] font-semibold text-[--text-secondary] mb-2"
```

**Field error message**
```
class="mt-1.5 text-[14px] text-[#EF4444] leading-normal"
```

**Helper text**
```
class="mt-1.5 text-[14px] text-[--text-muted] leading-normal"
```

---

### Card

**Default card**
```
class="rounded-xl border border-[--border] bg-[--bg-surface] p-6
       shadow-sm"
```

**Interactive card (course card, catalog item)**
```
class="rounded-xl border border-[--border] bg-[--bg-surface] p-6
       shadow-sm
       transition-all duration-150 cursor-pointer
       hover:border-[#F05A2A]/40 hover:bg-[--bg-surface-raised] hover:-translate-y-0.5 hover:shadow-md"
```

**Card header (inside card)**
```
class="flex items-start justify-between gap-4 mb-4"
```

**Card title**
```
class="text-[20px] font-semibold text-[--text-primary] leading-snug"
```

**Card meta row**
```
class="flex items-center gap-3 text-[14px] text-[--text-secondary]"
```

---

### Badge

**Default (neutral)**
```
class="inline-flex items-center px-2.5 py-1 rounded-md
       bg-[--bg-surface-raised] border border-[--border]
       text-[14px] font-semibold text-[--text-secondary]"
```

**Success**
```
class="inline-flex items-center px-2.5 py-1 rounded-md
       bg-[#22C55E]/15 border border-[#22C55E]/30
       text-[14px] font-semibold text-[#22C55E]"
```

**Destructive / fail**
```
class="inline-flex items-center px-2.5 py-1 rounded-md
       bg-[#EF4444]/15 border border-[#EF4444]/30
       text-[14px] font-semibold text-[#EF4444]"
```

**Warning**
```
class="inline-flex items-center px-2.5 py-1 rounded-md
       bg-[#F59E0B]/15 border border-[#F59E0B]/30
       text-[14px] font-semibold text-[#F59E0B]"
```

**Accent (public / featured)**
```
class="inline-flex items-center px-2.5 py-1 rounded-md
       bg-gradient-to-r from-[#F03C2E]/15 to-[#FF7C1F]/15
       border border-[#F05A2A]/30
       text-[14px] font-semibold text-[#FF7C1F]"
```

---

### Progress bar

**Track**
```
class="w-full h-2 rounded-full bg-[--bg-surface-raised] overflow-hidden"
```

**Fill (animated)**
```
class="h-full rounded-full bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F]
       transition-[width] duration-500 ease-out"
```
Set `style={{ width: `${percent}%` }}` dynamically.

---

### Divider

```
class="w-full h-px bg-[--border]"
```

---

### Alert / inline message

**Error alert**
```
class="flex items-start gap-3 p-4 rounded-lg
       bg-[#EF4444]/10 border border-[#EF4444]/25
       text-[14px] text-[#EF4444]"
```

**Success alert**
```
class="flex items-start gap-3 p-4 rounded-lg
       bg-[#22C55E]/10 border border-[#22C55E]/25
       text-[14px] text-[#22C55E]"
```

---

## 6. Motion Principles

### Philosophy
Subtle and purposeful. Motion communicates state changes — it never decorates. No animations on static elements. No looping animations in the main UI.

### Durations
| Purpose | Duration | Easing |
|---------|----------|--------|
| Color / border / opacity transitions | 150ms | `ease-in-out` (Tailwind: `duration-150`) |
| Transform hover lifts (cards) | 150ms | `ease-out` |
| Progress bar fill (on mount / update) | 500ms | `ease-out` (Tailwind: `duration-500`) |
| Page-level enter (fade in) | 200ms | `ease-out` |
| Modal / overlay open | 200ms | `ease-out` |
| Modal / overlay close | 150ms | `ease-in` |

### Rules
1. All interactive elements have a `transition` class. No element changes appearance without it.
2. Page-level transitions: fade-in only (`opacity-0` to `opacity-100`). No slide animations on route changes in v1.
3. Quiz feedback (correct/wrong answer) may use a single pulse or shake — one iteration only, never looping.
4. Skeleton loaders use a subtle pulse (`animate-pulse`). Do not use spinners for content areas — spinners are reserved for button loading states.
5. Never animate layout (avoid `transition-all` on elements that can change width/height unexpectedly — use specific properties: `transition-colors`, `transition-opacity`, `transition-transform`).

---

## 7. Breakpoints

Tailwind v4 defaults — mobile-first:

| Name | Min width | Target device |
|------|-----------|--------------|
| (default) | 0px | Mobile — all base styles target this |
| `sm` | 640px | Large phones / small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Wide screens |

### Content max widths
| Layout zone | Max width | Class |
|-------------|-----------|-------|
| Global page container | 1280px | `max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8` |
| Auth forms | 400px | `max-w-[400px] w-full mx-auto` |
| Course creation form | 680px | `max-w-[680px] w-full mx-auto` |
| Video + quiz pane | 960px | `max-w-[960px] w-full mx-auto` |
| Catalog grid | full container | 2-col on md, 3-col on lg, 4-col on xl |

---

## 8. Layout Shells

### 8.1 Auth layout
Used for: `/login`, `/signup`, `/forgot-password`, `/reset-password`

Structure:
```
<main class="min-h-screen bg-[--bg-base] flex flex-col items-center justify-center px-4 py-16">
  <!-- Logo lockup -->
  <div class="flex items-center gap-3 mb-10">
    <img src="/images/YouCourseLogo.png" alt="YouCourse" class="h-10 w-10 object-contain" />
    <span class="text-[20px] font-semibold text-[--text-primary]">YouCourse</span>
  </div>
  <!-- Form card -->
  <div class="w-full max-w-[400px] rounded-xl border border-[--border] bg-[--bg-surface] p-8 shadow-sm">
    {/* page heading + form */}
  </div>
  <!-- Footer link (sign in / sign up toggle) -->
  <p class="mt-6 text-[14px] text-[--text-secondary]">...</p>
</main>
```

### 8.2 App layout (authenticated shell)
Used for: `/dashboard`, `/courses/*`, `/create/*`

Structure:
```
<div class="min-h-screen bg-[--bg-base] flex flex-col">
  <!-- Top nav bar -->
  <header class="sticky top-0 z-40 border-b border-[--border] bg-[--bg-surface]/95 backdrop-blur-sm">
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Logo + wordmark -->
      <a href="/dashboard" class="flex items-center gap-2.5">
        <img src="/images/YouCourseLogo.png" alt="" class="h-8 w-8 object-contain" />
        <span class="text-[16px] font-semibold text-[--text-primary]">YouCourse</span>
      </a>
      <!-- Nav links (desktop) -->
      <nav class="hidden md:flex items-center gap-1">...</nav>
      <!-- User menu + theme toggle -->
      <div class="flex items-center gap-3">...</div>
    </div>
  </header>
  <!-- Page content -->
  <main class="flex-1">
    <div class="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </div>
  </main>
</div>
```

Nav bar active link indicator: 2px bottom border using the accent gradient, or a short gradient underline `border-b-2 border-[#F05A2A]`.

### 8.3 Content / video layout (learner flow)
Used for: course watch page (`/courses/[id]/learn/[videoIndex]`)

Structure: two-pane on desktop, stacked on mobile.
```
<div class="max-w-[960px] mx-auto px-4 py-6 flex flex-col gap-6">
  <!-- Video embed (full width) -->
  <div class="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
    {/* YouTubeEmbed or react-youtube */}
  </div>
  <!-- Video title + metadata -->
  <div class="flex flex-col gap-1">
    <h1 class="text-[20px] font-semibold text-[--text-primary]">...</h1>
    <p class="text-[14px] text-[--text-secondary]">...</p>
  </div>
  <!-- Progress stepper (lesson list) -->
  <div class="flex flex-col gap-2">...</div>
  <!-- Quiz panel (hidden until video complete) -->
  <div class="rounded-xl border border-[--border] bg-[--bg-surface] p-6">
    {/* quiz questions */}
  </div>
</div>
```

### 8.4 Dashboard layout
Used for: `/dashboard`

Structure: stat summary row on top, then a two-column grid (in-progress courses left, recently created right) on desktop; single column on mobile.
```
<div class="flex flex-col gap-8">
  <section>{/* greeting + stat cards row */}</section>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <section>{/* In Progress */}</section>
    <section>{/* My Courses (created) */}</section>
  </div>
</div>
```

---

## 9. Copywriting Voice

### Tone
Direct, confident, and warm without being casual. Treat the learner as an intelligent adult who came to actually learn something — not to be entertained. No exclamation marks on structural UI (buttons, labels, nav). Reserve enthusiasm for genuine achievement moments (course completion, passing a quiz).

### Principles
1. **Verb-first CTAs.** Never "Enrollment" — always "Enroll in Course". Never "Submission" — always "Submit Answer".
2. **Short headings.** Page headings: 3-6 words. Card titles: use the course title as-is.
3. **Problem + action for errors.** Not "Error." Say what broke and what the user should do: "Couldn't load video. Try refreshing the page."
4. **Empty states earn their space.** Empty states explain what will appear here and offer a clear path to create it. Never just "No courses yet."
5. **Progress is personal.** Use second person for learner state: "You've completed 3 of 8 lessons." Not "3/8 lessons completed."

### CTA label standards (per context)
| Action | Label |
|--------|-------|
| Start learning a course | "Start Course" |
| Continue a course in progress | "Continue Learning" |
| Enroll and begin | "Enroll & Start" |
| Submit quiz answers | "Submit Answers" |
| Retry a failed quiz | "Try Again" |
| Generate a new course | "Generate Course" |
| Publish a course | "Publish Course" |
| Save draft | "Save Draft" |
| Sign up | "Create Account" |
| Log in | "Sign In" |
| Log out | "Sign Out" |
| Reset password (initiate) | "Send Reset Link" |
| Reset password (set new) | "Set New Password" |

### Empty states
| Context | Copy |
|---------|------|
| Dashboard — no courses enrolled | "You haven't started a course yet. Browse the catalog to find one." [Browse Catalog button] |
| Dashboard — no courses created | "You haven't created a course yet. Build one from any YouTube topic in minutes." [Generate Course button] |
| Catalog — no public courses | "No courses published yet. Be the first to create one." [Generate Course button] |

### Error states
| Context | Copy |
|---------|------|
| Login failed (wrong credentials) | "Incorrect email or password. Double-check your details and try again." |
| Sign-up email already exists | "An account with this email already exists. Sign in instead?" |
| Password reset — email not found | "We couldn't find an account with that email." |
| Password reset email sent | "Check your inbox — we sent a reset link to {email}." |
| Quiz failed (score below 70%) | "You scored {score}%. You need 70% to continue. Review the video and try again." |
| Network / server error | "Something went wrong on our end. Wait a moment and try again." |

### Destructive confirmation patterns
| Action | Confirmation copy |
|--------|-----------------|
| Delete a course | "Delete this course? This cannot be undone. All videos and questions will be permanently removed." [Delete Course] [Cancel] |
| Unenroll from a course | "Leave this course? Your progress will be lost." [Leave Course] [Keep Learning] |

---

## 10. Accessibility Baseline

### Requirements (WCAG 2.1 AA)

1. **Color contrast minimums**
   - Text primary on bg-base (dark): `#F0F4F8` on `#0D1B2A` — contrast ratio ~14:1. Passes AA + AAA.
   - Text secondary on bg-base: `#8BA3BA` on `#0D1B2A` — contrast ratio ~5.2:1. Passes AA.
   - Text muted on bg-base: `#4E6A82` on `#0D1B2A` — verify per use; use only for decorative/non-essential text.
   - Accent solid `#F05A2A` on `#0D1B2A` — do NOT render body text in accent color. Accent is for backgrounds and decorative elements only.
   - White text on gradient button: passes AA at all gradient stops (both `#F03C2E` and `#FF7C1F` have sufficient contrast with white).

2. **Focus management**
   - All interactive elements have a visible `focus-visible` ring using `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A]`.
   - Never use `outline: none` without providing an equivalent visible focus indicator.
   - Modal open: focus moves to modal container. Modal close: focus returns to trigger element.

3. **Keyboard navigation**
   - Tab order follows visual reading order.
   - Quiz answer options are navigable via arrow keys (treat as a radio group).
   - Video controls are operated via the YouTube embed's native keyboard support.

4. **Semantic HTML**
   - Use `<h1>` once per page. Section headings follow logical `h2` → `h3` hierarchy — never skip levels.
   - Buttons do actions. Links navigate. Never `<div onClick>`.
   - Form inputs have associated `<label>` elements via `for`/`id` or wrapping. Never label via placeholder alone.
   - Progress indicators use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
   - Quiz radio groups use `<fieldset>` + `<legend>` per question.

5. **Images and icons**
   - Logo `<img>` in nav: `alt="YouCourse"` on the standalone logo. When paired with the text wordmark, use `alt=""` (decorative — the text conveys the name).
   - Icon-only buttons require `aria-label`.
   - Purely decorative icons use `aria-hidden="true"`.

6. **Motion / reduced motion**
   - Wrap all `transition` and `animation` classes in `motion-safe:` where the animation is non-essential.
   - Quiz answer shake/pulse feedback: add `motion-reduce:animate-none` override.
   - Progress bar transition: `motion-safe:transition-[width] motion-safe:duration-500`.

7. **Mobile / touch**
   - Minimum touch target: 44x44px. Enforced via `min-h-[44px]` and `min-w-[44px]` on all interactive elements.
   - No hover-only affordances — all hover states have an equivalent active/focus state.

---

*UI-BRAND.md — YouCourse — 2026-05-30*
