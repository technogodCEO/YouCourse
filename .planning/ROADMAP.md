# Roadmap: YouCourse

## Overview

YouCourse is built in four phases that follow strict dependency order. Auth and schema come first because every other subsystem needs session identity and stable tables. The AI ingestion pipeline is second because no quiz, player, or gate can exist without questions in the database — this is the critical path item. Course creation UI is third, as it is simply a trigger surface for the working pipeline. The learner flow and catalog close out v1: sequential gated video learning is the core product mechanic, and the public catalog makes finished courses discoverable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, database schema, and authentication
- [ ] **Phase 2: AI Ingestion Pipeline** - LLM curriculum generation, YouTube search, transcript fetch, and question batch generation
- [ ] **Phase 3: Course Creation & Publishing** - Creator UI to trigger ingestion, review status, set visibility, and publish
- [ ] **Phase 4: Learner Flow & Catalog** - Sequential gated video player, quiz engine, progress tracking, and public course catalog

## Phase Details

### Phase 1: Foundation
**Goal**: Authenticated users can access the app with persistent sessions and a stable database schema supports all future data
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password and immediately use the app
  2. User can log in and remain logged in across browser refresh and tab close/reopen
  3. User can reset a forgotten password via an emailed link and regain access
  4. Protected routes redirect unauthenticated users to login; authenticated users pass through
**Plans**: 3 plans
- [x] 01-01-PLAN.md — Project scaffold, Drizzle schema, Auth.js v5 config + session/DAL foundation
- [ ] 01-02-PLAN.md — Sign-up, login, session persistence, protected dashboard, proxy.ts route protection
- [ ] 01-03-PLAN.md — Password reset flow (Resend email + token table + forgot/reset pages)
**UI hint**: yes

### Phase 2: AI Ingestion Pipeline
**Goal**: Given a topic and length, the system automatically generates a curriculum, finds matching YouTube videos, fetches transcripts, and produces validated comprehension questions — all persisted to the database before any student sees the course
**Depends on**: Phase 1
**Requirements**: CGEN-02, CGEN-03, CGEN-04, CGEN-05
**Success Criteria** (what must be TRUE):
  1. Submitting a topic and course length produces an ordered list of lesson topics via LLM
  2. Each lesson topic maps to one YouTube video found via automated search (no manual URL entry)
  3. Video metadata and transcripts are fetched once and persisted; zero YouTube API calls are made on any subsequent student view
  4. At least 5 comprehension questions per video are generated from transcript content and stored with the correct answer index
  5. Videos with unavailable or low-quality transcripts surface a clear status indicator rather than silently generating hallucinated questions
**Plans**: TBD

### Phase 3: Course Creation & Publishing
**Goal**: A logged-in user can generate a course by entering a topic and length, monitor ingestion progress per video, edit the title and description, set visibility, and publish — producing a complete course ready for learners
**Depends on**: Phase 2
**Requirements**: CGEN-01, CGEN-06, CGEN-07
**Success Criteria** (what must be TRUE):
  1. User can enter a topic and select Quick / Standard / Long to kick off course generation from a single form
  2. User can see per-video ingestion status (pending / processing / ready / transcript unavailable) while the pipeline runs
  3. User can edit the auto-generated course title and description before publishing
  4. User can set course visibility to public or private before publishing, and the setting is enforced on the published course
**Plans**: TBD
**UI hint**: yes

### Phase 4: Learner Flow & Catalog
**Goal**: Learners can discover public courses, enroll, watch videos sequentially, pass comprehension quizzes to unlock the next video, and resume from where they left off — with all gate logic evaluated server-side
**Depends on**: Phase 3
**Requirements**: LRNN-01, LRNN-02, LRNN-03, LRNN-04, LRNN-05, LRNN-06, LRNN-07, CTLG-01, CTLG-02
**Success Criteria** (what must be TRUE):
  1. Public courses appear in a browsable catalog; logged-in users can open any course detail page showing the full curriculum and video list
  2. User can enroll in a course and immediately see which video is current, which are locked, and which are complete
  3. User watches the current video embedded in the app and is presented with comprehension questions when the video ends
  4. User who scores below 70% is told they did not pass and can retry; user who scores at or above 70% sees the next video unlock
  5. User who closes the app and returns later resumes from the last video they completed without losing progress
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/3 | In Progress | — |
| 2. AI Ingestion Pipeline | 0/TBD | Not started | - |
| 3. Course Creation & Publishing | 0/TBD | Not started | - |
| 4. Learner Flow & Catalog | 0/TBD | Not started | - |
