# Requirements: YouCourse

**Defined:** 2026-05-30
**Core Value:** A student finishes a course with provable comprehension — not just views, but verified understanding — because every video is gated by questions they had to pass.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in with email and password
- [x] **AUTH-04**: User session persists across browser refresh

### Course Generation

- [ ] **CGEN-01**: User can enter a topic and select a course length (Quick / Standard / Long) to generate a course
- [ ] **CGEN-02**: System generates a structured curriculum (ordered lesson topics) from the input using an LLM
- [ ] **CGEN-03**: System searches YouTube and selects the best-matching video for each curriculum lesson
- [ ] **CGEN-04**: System fetches video metadata and transcripts at generation time and caches them
- [ ] **CGEN-05**: System batch-generates comprehension questions for each video from its cached transcript using an LLM
- [ ] **CGEN-06**: User can set a course as public or private (link-only) before publishing
- [ ] **CGEN-07**: User can give the generated course a title and description before publishing

### Learner Flow

- [ ] **LRNN-01**: User can view a course detail page showing the curriculum and video list
- [ ] **LRNN-03**: User watches the current video embedded in the app
- [ ] **LRNN-04**: User is presented with comprehension questions after completing each video
- [ ] **LRNN-05**: User must achieve the passing score (≥70%) on the quiz to unlock the next video
- [ ] **LRNN-06**: User can retry the quiz if they fail
- [ ] **LRNN-07**: User's progress is saved and resumes from their last completed video on return

## v2 Requirements

### Enhanced Course Creation

- **CGEN-v2-01**: Creator can review and edit the generated curriculum before video search runs
- **CGEN-v2-02**: Creator can swap individual videos for alternatives after generation
- **CGEN-v2-03**: Creator can reorder or remove lessons after course is published

### Enhanced Learner Experience

- **LRNN-v2-01**: Learner can request additional questions for a video (served from cached transcript, no new LLM call)
- **LRNN-v2-02**: Learner can flag a question as incorrect or unclear
- **LRNN-v2-03**: Learner receives a completion record when they finish a course

### Discovery

- **CTLG-v2-01**: Public courses appear in a browsable catalog
- **CTLG-v2-02**: Catalog supports keyword search by topic
- **CTLG-v2-03**: Catalog supports filtering by course length or subject area
- **CTLG-v2-04**: Anonymous users can browse the public catalog

### Monetization

- **MON-v2-01**: Private courses can be placed behind a paywall
- **MON-v2-02**: Creator receives payment when a learner purchases access to a private course

## Out of Scope

| Feature | Reason |
|---------|--------|
| Password reset via email | Deferred — forgotten passwords not recoverable in POC |
| Explicit course enrollment | Opening a course starts it; no separate enroll step needed for POC |
| Public course catalog | Share by direct link in POC; catalog is v2 |
| Per-video ingestion status polling | Simplified to "generating…" then redirect when ready |
| OAuth login (Google/GitHub) | Email/password sufficient for v1; adds complexity |
| Email verification on sign-up | Reduces friction for v1; add when spam becomes a concern |
| Native mobile app | Mobile-responsive web covers v1 needs |
| Manual video URL entry | Automated curriculum+search is the core product differentiator |
| YouTube playlist bulk import | Requires async job queue; separate from core flow |
| AI chatbot / tutoring | High complexity, out of scope for course-based learning |
| Creator analytics dashboard | Deferred until courses have meaningful usage data |
| Completion certificates | Deferred; must establish completion value first |
| Video availability monitoring / background jobs | Can be handled operationally in v1; add when scale requires it |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| CGEN-01 | Phase 3 | Pending |
| CGEN-02 | Phase 2 | Pending |
| CGEN-03 | Phase 2 | Pending |
| CGEN-04 | Phase 2 | Pending |
| CGEN-05 | Phase 2 | Pending |
| CGEN-06 | Phase 3 | Pending |
| CGEN-07 | Phase 3 | Pending |
| LRNN-01 | Phase 4 | Pending |
| LRNN-03 | Phase 4 | Pending |
| LRNN-04 | Phase 4 | Pending |
| LRNN-05 | Phase 4 | Pending |
| LRNN-06 | Phase 4 | Pending |
| LRNN-07 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-30*
*Last updated: 2026-05-30 — POC scope cut (AUTH-03, LRNN-02, CTLG-01/02 deferred)*
