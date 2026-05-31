# YouCourse — Roadmap

## v1 — Shipped

All four phases complete. Core learning loop is live: topic → AI-generated course → gated quiz progress.

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Scaffold, DB schema, email/password auth | ✅ Complete |
| 2. AI Ingestion | Curriculum gen, YouTube search, question gen | ✅ Complete |
| 3. Course Creation | Generate form, course/edit pages, dashboard | ✅ Complete |
| 4. Learner Flow | Video player, quiz engine, sequential gating | ✅ Complete |

### Phase Dependency Order
1 → 2 → 3 → 4. Auth and schema first; ingestion pipeline is the critical path (no quiz can exist without questions in the DB).

---

## v2 — Planned

### Enhanced Learning
- **LRNN-v2-01** Learner requests additional questions (from cached transcript — no new LLM call)
- **LRNN-v2-02** Learner flags a question as incorrect/unclear
- **LRNN-v2-03** Completion record issued when course is finished

### Enhanced Creation
- **CGEN-v2-01** Creator reviews/edits generated curriculum before video search runs
- **CGEN-v2-02** Creator swaps individual videos for alternatives post-generation
- **CGEN-v2-03** Creator reorders or removes lessons after publishing

### Discovery
- **CTLG-v2-01** Public course catalog (browsable)
- **CTLG-v2-02** Keyword search by topic
- **CTLG-v2-03** Filter by length or subject
- **CTLG-v2-04** Anonymous catalog browsing

### Monetization
- **MON-v2-01** Private course paywall
- **MON-v2-02** Creator receives payment on purchase

---

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| OAuth login | Email/password sufficient for v1 |
| Email verification on sign-up | Reduces friction; add when spam is a concern |
| Manual video URL entry | Automated curriculum+search is the core differentiator |
| YouTube playlist bulk import | Requires async job queue |
| Per-video ingestion status polling | Simplified to "generating…" then redirect |
| Creator analytics | Deferred until courses have meaningful usage |
| Completion certificates | Deferred; establish value first |
| Native mobile app | Mobile-responsive web covers v1 |
