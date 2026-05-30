# Feature Research

**Domain:** YouTube-sequenced course platform with AI-gated comprehension
**Researched:** 2026-05-30
**Confidence:** MEDIUM (web search unavailable; based on training knowledge of Coursera, Udemy, Khan Academy, edX, Teachable, Thinkific, and YouTube-native learning tools through Aug 2025)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User authentication (sign up / log in) | Every platform has accounts; anonymous use feels unsafe | LOW | Email+password minimum; OAuth (Google) is expected given YouTube context |
| Course catalog / browse page | Learners expect a place to discover public courses | LOW | Grid/card layout with title, creator, video count |
| Course detail page | Users need to evaluate a course before enrolling | LOW | Title, description, video list with durations, creator name |
| Video playback inside the platform | Learners expect the video right there, not redirected to YouTube | LOW | YouTube iframe embed; no custom player needed |
| Sequential video progression | Learners expect a clear "next" flow, not a free-for-all | LOW | Linear list with state (locked / current / completed) |
| Comprehension check after each video | Core mechanic — the reason this product exists | MEDIUM | Multiple-choice questions; must-pass gate; score display |
| Progress tracking | Learners expect to know where they are and resume later | MEDIUM | Per-course: videos completed, current video, % done |
| Course creation by authenticated users | Creators expect to build and publish without a form submission to a human | MEDIUM | URL paste → metadata fetch → question generation → publish |
| Public / private visibility toggle | Creators expect access control over their own content | LOW | Toggle at publish time; private = link-only |
| Mobile-responsive layout | Over 60% of YouTube traffic is mobile; a non-responsive platform feels broken | MEDIUM | Responsive from day one per PROJECT.md |
| Course enrollment / "start learning" action | Users expect a clear entry point to begin a course | LOW | Button that creates a learner enrollment record |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by convention, but add real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-generated comprehension questions at creation time | No other YouTube-playlist tool gates with verified understanding; this IS the core value | HIGH | Batch LLM call against YouTube transcript at course creation; questions cached |
| Must-pass gate between videos | Distinguishes from a plain playlist; learners earn the next video | LOW | Pass threshold (likely 70%) enforced server-side; prevents skip |
| "More questions" on demand from cache | Learners who want extra practice get it instantly; no new API cost | LOW | Pull additional questions from cached transcript metadata already stored |
| Provable completion | Learner ends with a record that they passed every gate, not just watched | LOW | Completion record with per-video scores stored; basis for future certificate |
| AI questions tied to actual video content | Generic quiz platforms use static question banks; these are video-specific | HIGH | Dependent on transcript quality — YouTube auto-captions vary |
| Creator course discovery (public catalog) | Surfaces good curated sequences that would otherwise stay private playlists | LOW | Public catalog with basic search/filter by topic |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like obvious additions but create disproportionate complexity or dilute focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manual question authoring by creators | Creators want control over questions | Doubles the creation UX complexity; AI questions are the product's moat — manual entry undermines it; curation burden shifts to non-experts | Let creators flag/hide individual AI questions post-generation (simpler override) |
| Video upload / non-YouTube sources | Creators want a one-stop shop | YouTube licensing, storage cost, encoding pipeline; scope explodes; loses the zero-storage advantage of YouTube embedding | v1 = YouTube only; add Vimeo later if validated |
| Real-time collaborative course building | Seems modern / productive | Multi-user editing on a course is rarely needed (solo creators); adds websocket/locking complexity for marginal use | Share a draft link (read-only preview) instead |
| Social feed / comments on videos | Community feel | Duplicates YouTube comments which are already there; requires moderation infrastructure | Link to YouTube discussion or defer to a future forum milestone |
| Native mobile app | Learners use phones | Responsive web covers the use case for v1; native app is a separate engineering track | Responsive-first web with PWA meta tags for "add to home screen" |
| AI chatbot / tutoring assistant per video | High engagement potential | Requires per-session LLM calls; expensive at scale; distraction from the gated-question mechanic | Additional questions from cache is the lean version of this |
| Gamification (badges, streaks, leaderboards) | Engagement boost | Significant UI/DB work; engagement mechanics can be added on top later but should not drive v1 architecture | Progress percentage and completion record provide lightweight motivation |
| Paywall / paid course access | Creator monetization | Requires payment processor integration, entitlement management, refund handling — a full feature track | Explicitly deferred per PROJECT.md; private link = soft gating for now |
| Bulk video import (YouTube playlist import) | Reduces creator friction | YouTube playlist API can return up to 200 videos; generating questions for all at creation time could exhaust LLM quota and take too long | Cap at a reasonable limit (e.g., 20 videos) per course in v1; add playlist import later with async job |

---

## Feature Dependencies

```
[User Auth]
    └──required by──> [Course Creation]
    └──required by──> [Enrollment]
    └──required by──> [Progress Tracking]

[Course Creation]
    └──requires──> [YouTube Metadata Fetch]
                       └──enables──> [AI Question Generation (batched)]
                                         └──enables──> [Must-Pass Gate]
                                         └──enables──> [More Questions from Cache]

[Enrollment]
    └──required by──> [Video Playback in sequence]
                           └──triggers──> [Comprehension Check]
                                              └──gates──> [Next Video Unlock]
                                              └──writes──> [Progress Tracking]

[Progress Tracking]
    └──enables──> [Resume Course]
    └──enables──> [Completion Record]

[Public Catalog]
    └──requires──> [Course Creation]
    └──requires──> [Public/Private Toggle]

[Completion Record]
    └──enables (future)──> [Certificate]
    └──enables (future)──> [Creator Analytics]
```

### Dependency Notes

- **Course Creation requires YouTube Metadata Fetch:** Video title, description, duration, and transcript are fetched once at creation; all downstream features (questions, gate, player) consume this cache.
- **AI Question Generation requires Transcript:** YouTube auto-captions are the transcript source; low-quality or missing captions degrade question quality — this is a known risk.
- **Must-Pass Gate requires Comprehension Check:** The gate is the enforcement mechanism for the check; they are the same feature surface.
- **More Questions from Cache requires AI Question Generation to have run:** The cache must be populated at creation time; "more questions" is a read-only operation against that cache.
- **Progress Tracking requires Enrollment:** Progress is per-learner per-course; enrollment creates the record.
- **Public Catalog conflicts with Private-Only courses:** Public catalog only shows courses where `visibility = public`; this is a filter, not a conflict, but the data model must carry the flag from day one.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core mechanic (gated comprehension).

- [ ] User auth (sign up, log in, log out) — identity required for progress and creation
- [ ] Course creation: paste YouTube URL sequence → fetch metadata → batch AI question generation → publish — this is the entire creator value prop
- [ ] Public / private toggle at publish — basic access control
- [ ] Public course catalog — discovery surface for learners
- [ ] Course detail page — evaluate before enrolling
- [ ] Enrollment (start course action) — entry point to learner flow
- [ ] Sequential video player with must-pass comprehension gate — the core learning mechanic
- [ ] Progress tracking (which videos done, current position) — resume support
- [ ] More questions from cache — learner expansion within the gated flow
- [ ] Mobile-responsive layout throughout — non-negotiable per PROJECT.md

### Add After Validation (v1.x)

Features to add once the core mechanic is proven.

- [ ] Completion record / certificate (PDF or shareable link) — add when learners ask "what do I get for finishing?"
- [ ] Creator course management (edit, reorder, unpublish) — add when creators report frustration with immutable courses
- [ ] Basic search / filter on catalog — add when catalog has enough courses to need navigation
- [ ] Question quality feedback (flag bad question) — add when AI question quality complaints surface
- [ ] YouTube playlist bulk import (with video cap) — add when creators consistently request it; requires async job design

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] Creator analytics (enrollments, completion rates, per-video drop-off) — defer; requires data pipeline
- [ ] Paywall / paid course access — explicitly deferred per PROJECT.md; requires Stripe integration
- [ ] Creator-controlled question overrides (flag / replace individual questions) — defer; manual authoring increases scope
- [ ] Vimeo / other video sources — defer; validate YouTube-only first
- [ ] Native mobile app (iOS/Android) — defer; responsive web is sufficient for v1

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| User auth | HIGH | LOW | P1 |
| Course creation with AI questions | HIGH | HIGH | P1 |
| Must-pass comprehension gate | HIGH | MEDIUM | P1 |
| Sequential video player | HIGH | LOW | P1 |
| Progress tracking | HIGH | MEDIUM | P1 |
| Public catalog | HIGH | LOW | P1 |
| Mobile-responsive layout | HIGH | MEDIUM | P1 |
| Enrollment action | HIGH | LOW | P1 |
| Course detail page | MEDIUM | LOW | P1 |
| Public/private toggle | MEDIUM | LOW | P1 |
| More questions from cache | MEDIUM | LOW | P1 |
| Completion record | MEDIUM | LOW | P2 |
| Creator course editing | MEDIUM | MEDIUM | P2 |
| Catalog search/filter | MEDIUM | LOW | P2 |
| Question quality feedback | LOW | LOW | P2 |
| Creator analytics | HIGH | HIGH | P3 |
| Paywall / monetization | MEDIUM | HIGH | P3 |
| Vimeo support | LOW | HIGH | P3 |
| Native mobile app | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Platforms surveyed (from training knowledge through Aug 2025): Coursera, Udemy, Khan Academy, edX, Teachable, Thinkific, YouTube Chapters (native), Notion-based course layouts, and YouTube playlist tools.

| Feature | Coursera / edX | Udemy / Teachable | Khan Academy | YouCourse Approach |
|---------|----------------|-------------------|--------------|-------------------|
| Video source | Own hosting | Own hosting | Own hosting | YouTube embed only — zero storage cost |
| Comprehension gate | Quizzes present but often skippable | Quizzes present but skippable | Gates required for mastery mode | Hard gate — cannot proceed without passing |
| Question authoring | Instructor-authored | Instructor-authored | Instructor-authored + AI assist | Fully AI-generated from transcript at creation |
| Course creation friction | High (multi-step, days) | Medium (upload + form) | High (curated) | Low (paste URLs → publish) |
| Progress tracking | Yes | Yes | Yes (detailed) | Yes (per-video, score-based) |
| Mobile experience | App + responsive web | App + responsive web | App + responsive web | Responsive web only (v1) |
| Monetization | Revenue share | Revenue share + pricing | Free | Deferred to v2 |
| Discoverability | Large catalog, search | Large catalog, search | Topic-based | Public catalog (basic v1) |
| "More practice" on demand | Some (Khan) | Rarely | Yes | Yes — from cached questions |

**Key insight:** No mainstream platform combines (a) YouTube as the sole video source with (b) hard comprehension gates and (c) AI-generated questions. The closest analog is Khan Academy's mastery mode, but its content is proprietary. YouCourse's moat is making this mechanic available for any YouTube content any creator sequences.

---

## Sources

- Platform feature analysis based on training knowledge of Coursera, Udemy, Khan Academy, edX, Teachable, Thinkific (through Aug 2025) — MEDIUM confidence
- YouCourse PROJECT.md requirements and constraints (authoritative for this project) — HIGH confidence
- YouTube Data API v3 capabilities and quota model (well-documented, stable) — HIGH confidence
- LLM transcript-to-question generation patterns (widely published 2023-2025) — MEDIUM confidence
- Note: WebSearch was unavailable during this research session; competitor feature claims should be spot-checked against current platform UI before roadmap finalization

---
*Feature research for: YouTube-sequenced learning platform with AI comprehension gating*
*Researched: 2026-05-30*
