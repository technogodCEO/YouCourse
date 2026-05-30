# Pitfalls Research

**Domain:** YouTube-based structured learning platform with LLM question generation and gated progression
**Researched:** 2026-05-30
**Confidence:** HIGH (YouTube API v3 and LLM integration patterns are well-documented; edtech UX pitfalls drawn from established patterns)

---

## Critical Pitfalls

### Pitfall 1: YouTube Transcript Unavailability Treated as Edge Case, Not Norm

**What goes wrong:**
Developers assume most YouTube videos have accessible transcripts/captions. In practice, a significant portion of videos have: auto-captions in a non-English language, disabled captions, manually-uploaded captions that the uploader has restricted, or no captions at all. The course creation flow silently fails or produces unusable questions when a transcript cannot be fetched.

**Why it happens:**
During development, developers test with well-known, high-production-value videos that reliably have captions. The happy path works. The failure path only surfaces when real users add obscure or non-English videos.

**How to avoid:**
- At course creation time, attempt transcript fetch for each video *before* the creator finalizes the course. Surface a clear per-video status: "Captions available", "Auto-captions only (lower quality)", or "No captions — questions cannot be generated."
- Provide the creator a choice: skip this video, remove it, or accept that questions cannot be generated for it.
- Do NOT silently generate hallucinated questions when no transcript exists. The LLM will confabulate content from the video title alone.
- Store a `transcript_status` field per video: `available | auto_only | unavailable`. This drives UI warnings and affects question quality metadata.

**Warning signs:**
- Questions generated for a video look generic or could apply to any video on the same topic.
- All questions are phrased around the video title keywords rather than specific video content.
- Zero test coverage of the "no transcript" code path.

**Phase to address:**
YouTube integration phase (course creation pipeline). Must be resolved before any LLM question generation is implemented.

---

### Pitfall 2: YouTube Data API v3 Quota Exhaustion from Unbudgeted Calls

**What goes wrong:**
The YouTube Data API v3 default quota is 10,000 units/day per project. `videos.list` costs 1 unit per call; `search.list` costs 100 units. Developers consume quota with:
- Calling the API on every page load instead of caching.
- Using `search.list` when `videos.list` with a known video ID would suffice.
- Fetching video metadata at student view time rather than course creation time.
- No quota monitoring until production hits the ceiling and all API calls start returning 403s.

**Why it happens:**
The quota limit feels abstract during development (it resets daily and the dev team uses low volume). The cost model only becomes apparent at real user scale or when a popular course gets many concurrent students.

**How to avoid:**
- Enforce the already-decided architecture: fetch all video metadata and transcripts exactly once at course creation and store in the database. Zero YouTube API calls at student view time.
- Use `videos.list` exclusively for fetching metadata by video ID — never `search.list` for anything in the critical path.
- Add a quota budget tracker in the admin/monitoring layer: log each YouTube API call with its unit cost. Alert at 7,000/10,000 units.
- Store a `youtube_api_fetched_at` timestamp per video. If a course creator adds the same video that already exists in the DB (any course), reuse cached metadata — do not re-fetch.
- For development, use a separate Google Cloud project so dev quota burns don't affect production.

**Warning signs:**
- No database table storing video metadata; every lookup queries YouTube directly.
- `search.list` appears anywhere in the codebase for a use case where the video ID is already known.
- No logging of YouTube API calls in development.

**Phase to address:**
YouTube integration phase. Quota architecture must be locked in before building the course creation UI.

---

### Pitfall 3: LLM Hallucination Producing Wrong-Answer Questions

**What goes wrong:**
The LLM generates a question with a "correct" answer that is factually wrong, or generates a distractor answer that is actually correct. A student who understands the video picks the right answer and is marked wrong, or picks the LLM's "correct" answer which is factually inaccurate. This destroys credibility of the platform's core mechanic.

**Why it happens:**
LLMs optimized for fluency produce grammatically confident wrong answers. Without ground-truth validation, there is no signal that a question is broken. The problem is invisible in initial demos because developers only read questions quickly without checking factual accuracy.

**How to avoid:**
- Ground every question in a specific transcript excerpt. The prompt must include the verbatim transcript segment and instruct the model to only generate questions answerable from that segment, not world knowledge.
- Use a structured output format (JSON schema) for questions: `{ question, correct_answer, distractors[], transcript_excerpt }`. Store the `transcript_excerpt` reference. This makes post-hoc auditing possible.
- Set LLM temperature to 0 or near-0 for question generation. Creativity increases hallucination risk in factual recall tasks.
- Generate more questions than needed (e.g., generate 8 to serve 5) and have a secondary LLM call verify each question is answerable from the transcript. Use the verified subset.
- For the MVP, focus on multiple-choice questions derived from explicit factual statements in the transcript rather than inference or synthesis questions — these are harder to hallucinate convincingly wrong.

**Warning signs:**
- Prompt does not include the transcript, only the video title and description.
- Questions are open-ended or synthesis-type ("What is the main theme?") rather than grounded in specific statements.
- No `transcript_excerpt` field stored alongside generated questions.
- LLM temperature set above 0.3 for question generation.

**Phase to address:**
LLM integration phase (question generation). The prompt design and output schema must be finalized before any question is shown to a student.

---

### Pitfall 4: Gated Progression Lock-Out with No Recovery Path

**What goes wrong:**
A learner fails the quiz gate repeatedly and cannot proceed. The platform has no mechanism for: resetting attempts, skipping after N failures, contacting support, or understanding why they failed. The learner abandons the course and never returns. If the failure is caused by a bad question (Pitfall 3), the learner is trapped by a platform bug, not their own comprehension gap.

**Why it happens:**
The gating mechanic is built as a hard binary pass/fail during the MVP because it's simpler to implement. Edge cases ("what if the questions are wrong?") are deferred.

**How to avoid:**
- Implement a "flag this question" mechanism from day one. Each question has a small report button. Flagged questions are stored for admin review. If a question is flagged by 3+ learners on the same answer, it is auto-suppressed and a replacement is served from the cached question pool.
- Set a maximum attempts limit per quiz session (e.g., 5 attempts), after which the student can re-watch the video and get a fresh question set from the cached pool.
- Never regenerate questions on retry via the LLM — serve from the pre-generated pool, just shuffle which questions are shown.
- Store `attempt_count` per (learner, video) pair. Surface this in UI so students know "You have 3 more attempts before you can reset."
- Add an instructor/admin bypass: course creators can unlock a specific learner's block if escalated.

**Warning signs:**
- No `attempts` tracking in the database schema.
- No "flag question" UI component in wireframes.
- Pass/fail is a single database boolean with no reset mechanism.
- QA only tests the happy path (student passes on first try).

**Phase to address:**
Gated progression phase. Must be addressed when the quiz gate mechanic is implemented, not deferred to a polish phase.

---

### Pitfall 5: Video Deletion or Privacy Change Breaking Active Courses

**What goes wrong:**
A YouTube video included in a published course is deleted by its uploader, made private, or age-restricted after the course is published. Students reach that video and see a broken embed. The course is permanently damaged with no creator notification.

**Why it happens:**
Developers cache metadata at creation time but do not build any freshness-checking mechanism. The video availability state is treated as immutable once fetched.

**How to avoid:**
- Store `video_status` per video in the DB: `active | deleted | private | unavailable`. Default is `active`.
- Run a background job (not on-demand) that re-checks video availability via `videos.list` once per day for all videos in active/published courses. This uses minimal quota (1 unit per video ID batch, up to 50 IDs per call).
- When a video is found unavailable: notify the course creator via email/in-app notification; mark the video with its new status; show a graceful "This video is no longer available" message to learners rather than a broken embed; suspend the gating requirement for that video so learners are not blocked.
- Distinguish between "video unavailable" (YouTube-side) and "video cached but not yet checked" (system state). These are different DB states.

**Warning signs:**
- `video_status` field does not exist in the database schema.
- No scheduled job or cron mechanism exists in the architecture.
- Broken video embeds return a YouTube error iframe with no app-level handling.

**Phase to address:**
YouTube integration phase (initial fetch), with the background refresh job addressed in the post-MVP hardening phase. The graceful degradation UI must be in the initial player implementation.

---

### Pitfall 6: LLM Cost Runaway from Transcript Length

**What goes wrong:**
A course creator adds a 2-hour lecture video. The transcript is 30,000+ tokens. The LLM call for question generation consumes a massive prompt, billing spikes unpredictably, and the generation may hit context window limits for cheaper model tiers, causing silent truncation or outright API errors.

**Why it happens:**
Developers test with short videos (5-10 min) during development. Cost and context window limits only become apparent when real users add full-length lectures, conference talks, or documentaries.

**How to avoid:**
- Chunk transcripts: split into segments of 2,000-3,000 tokens with overlap (e.g., 200-token overlap to preserve context boundaries). Generate questions per chunk, then deduplicate.
- Set a hard per-video token budget for question generation (e.g., use only the first 12,000 tokens of transcript, which covers ~90 minutes of content). Surface this to creators: "Questions generated from the first X minutes of this video."
- Store transcript character/token count in the DB. Apply chunking logic automatically above a threshold (e.g., 8,000 tokens).
- Track LLM cost per course-creation event. Log `tokens_in`, `tokens_out`, `model`, `cost_usd` per generation call. Alert when a single course creation exceeds $0.50 in LLM calls.
- Use a cheaper model for initial question generation (e.g., `gpt-4o-mini` or `claude-haiku`) and reserve premium models only for validation passes if needed.

**Warning signs:**
- No maximum transcript length guard in the question generation function.
- LLM calls send the entire transcript as a single prompt with no chunking.
- No cost logging for LLM API calls.
- Only short demo videos used in all testing.

**Phase to address:**
LLM integration phase. Token budgeting and chunking logic must be built before question generation is exposed to users.

---

### Pitfall 7: Course Catalog Privacy Leak via Predictable IDs

**What goes wrong:**
Private courses (link-only) use auto-incremented integer IDs: `/course/42`. A logged-in user who discovers their own course ID (`/course/100`) can enumerate neighboring IDs and access private course content.

**Why it happens:**
Integer primary keys are the ORM/database default. Developers focus on the auth check ("is the user allowed to view this?") but miss that the check is only triggered when the user knows the URL.

**How to avoid:**
- Use UUIDs or `nanoid`-style random slugs for all course URLs from day one. `/course/xK9mPqR2` is not guessable.
- The public/private distinction then only requires an authorization check: public courses are visible to anyone with the URL, private courses require the creator to share the link explicitly.
- Enforce this at the routing layer: a middleware that checks `course.visibility` and `requester.id` before returning any course data. The check must apply to all API endpoints, not just the course detail page.
- Add an integration test: create a private course as User A, attempt to access it as User B (logged in, not the creator), verify 403.

**Warning signs:**
- Course URLs use sequential integer IDs.
- No test for "logged-in non-creator cannot access private course."
- Authorization check exists only in the frontend route guard, not the API layer.

**Phase to address:**
Course creation phase. ID scheme must be chosen before any course data is persisted. Changing from integers to UUIDs after data exists is a migration headache.

---

### Pitfall 8: Stale Cached Questions After Transcript or Video Update

**What goes wrong:**
A course creator updates a course by replacing a video (same course, different video ID, or same video with refreshed transcript). The old questions — generated from the old transcript — remain in the database and are served to new students. Questions may reference content that no longer exists in the current video version.

**Why it happens:**
Question generation is treated as a one-time event at course creation. The cache invalidation logic for "what happens when a video is replaced" is not designed until a real creator runs into it.

**How to avoid:**
- Model questions as belonging to a (course_id, video_id, transcript_hash) tuple, not just (course_id, video_id). If the transcript_hash changes, the question set is stale.
- When a creator replaces a video in an existing course, invalidate the question cache for that slot and trigger re-generation.
- Store `transcript_hash` (MD5 of the full transcript text) alongside cached questions. On each availability check (Pitfall 5), compare the current transcript hash — if changed, flag for re-generation.
- For v1, simpler approach: treat a video replacement as "add new video, remove old video" — new video triggers fresh question generation.

**Warning signs:**
- Questions table foreign key is only `(course_id, video_id)` with no versioning.
- No invalidation logic in the "edit course" flow.
- Course editing is deferred entirely — "editing not supported in v1" is a red flag for cache coherence.

**Phase to address:**
LLM integration phase and course editing phase. The data model must support versioning from the start even if editing UI is deferred.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Fetch transcript at question-generation time, not stored separately | Simpler schema | Re-fetch required if questions need regeneration; loses the source of truth for auditing hallucinations | Never — always store transcript separately |
| Use `search.list` to look up a video by URL | Easier URL parsing | 100 quota units per call vs. 1 unit for `videos.list` with extracted ID | Never — always extract video ID from URL and use `videos.list` |
| Store questions as a JSON blob on the video record | Faster initial schema | Cannot flag individual questions, cannot track per-question attempt data, cannot serve subsets | MVP only if no per-question analytics are needed; migrate before adding question flagging |
| Single LLM call with full transcript | Simpler code | Fails on long videos; no graceful degradation | Never — chunking guard must be in from day one |
| Integer primary keys for courses | ORM default | Enumerable private course IDs (Pitfall 7) | Never for user-facing resource IDs |
| Hard-code pass threshold at 70% | Avoids a config system | Requires code deploy to tune; cannot A/B test or adjust per-course | MVP only; add per-course threshold config in post-MVP |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| YouTube Data API v3 | Using `part=snippet,contentDetails,statistics` on every call even when only title+thumbnail is needed | Use the minimum `part` values needed. Each `part` adds to response size and counts toward quota units for some endpoints |
| YouTube Data API v3 | Assuming `videos.list` with a valid-looking ID always returns a result | Videos can exist but be region-restricted; the response items array may be empty for a valid ID; always check `items.length > 0` before processing |
| YouTube Transcript (via `youtube-transcript` or `ytdl-core`) | Fetching transcript server-side without rate-limiting | YouTube blocks IPs that make high-frequency transcript requests; implement per-IP and per-video fetch rate limiting; queue transcript fetches |
| YouTube Transcript | Assuming transcript language matches video language | Auto-captions may be in the wrong language; check `snippet.defaultAudioLanguage` from the video metadata and the track language code before using the transcript |
| OpenAI / Anthropic LLM API | Not setting `max_tokens` on question generation calls | Runaway generation on malformed prompts; always cap output at ~500 tokens for a batch of 5-8 questions |
| OpenAI / Anthropic LLM API | Retrying failed API calls with exponential backoff on rate limit errors but without idempotency keys | Duplicate question sets generated; use idempotency keys (OpenAI supports them) or store a `generation_status` field before calling the API |
| YouTube oEmbed / IFrame API | Assuming the IFrame API fires `onStateChange` events reliably on mobile | On iOS Safari, the YouTube IFrame API has known issues with `PLAYING` state detection; test watch completion tracking on mobile explicitly |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full transcript into memory to display course catalog | Course list page is slow; memory usage spikes | Store transcript separately from course/video metadata; catalog queries never touch transcript table | ~100 courses with 10 videos each |
| N+1 query: loading progress for each video in a course sequentially | Course detail page latency scales linearly with video count | Eager-load all progress records for a (learner, course) pair in one query | Courses with 15+ videos |
| Generating questions synchronously during HTTP request at course creation | Course creation request times out; creator sees error, retries, double-generates | Move question generation to a background job queue (BullMQ, Inngest, etc.); return immediately with "Generating questions..." status | Any video with transcript > 5,000 tokens (~8 min of content) |
| Checking video availability on every course detail page load | Slow page loads; YouTube API quota consumed unpredictably | Availability checks are background jobs only, never on the request path | 50+ active courses |
| Storing learner progress in a client-side cookie or localStorage | Progress lost on new device; state manipulation by learner | Progress always server-side in DB, cookie holds session token only | From day one — this is a correctness issue, not just scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Authorizing course access only in frontend route guards | Any learner can call the API directly and access any private course data or skip quiz gates | All authorization checks must be enforced in the API layer (middleware/server-side), never frontend-only |
| Storing YouTube API key in frontend JavaScript | Key scraped by anyone, quota burned by third parties | YouTube API key must only exist in environment variables on the server; never in client bundles |
| Trusting client-reported quiz scores | Learner modifies request payload to report 100% score and bypass the gate | Score calculation always server-side. Client sends answers, server evaluates correct/incorrect against the stored question data, server records the score |
| No rate limiting on course creation endpoint | A single user could trigger 1,000 LLM calls and thousands of YouTube API calls | Rate limit course creation: maximum N courses per hour per user (e.g., 5/hour); validate this at the API layer |
| Exposing raw LLM API errors to the client | Prompt text, model name, or internal system prompt leaked in error responses | Catch all LLM API errors server-side; return generic "Question generation failed" to client; log full error server-side only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication that questions are being generated during course creation | Creator thinks the form submission failed; refreshes; double-submits | Show a "Generating questions for video X of Y..." progress state. Use a job status endpoint the client polls. |
| Showing all quiz questions at once as a form | Learners jump to later questions, scan for patterns, game the test | Show one question at a time with no ability to go back within a session. Commit each answer before showing the next. |
| Pass threshold shown as a score ("You got 3/5") without telling the learner how many they need | Learner doesn't know if they passed or how far they are from passing | Show "You need 4/5 to continue. You got 3/5. Try again?" — make the gate explicit and non-mysterious. |
| Quiz gate on first video immediately, before learner is emotionally invested | First-time learners encounter friction before seeing any value; high bounce rate | Design the first-video experience as low-stakes. Consider a "practice" mode hint for the first video. |
| Forcing learners to re-watch entire video to reattempt quiz | Frustrating for learners who understood but got unlucky on question selection | Show timestamps in the feedback: "Review 12:34–15:00 of the video for this topic." Link to the timestamp in the YouTube embed. |
| Broken course with no explanation when video is unavailable (Pitfall 5) | Learner assumes the app is broken, not YouTube | Show a clear message: "This video was removed by its creator. The course owner has been notified." Do not show a broken embed. |

---

## "Looks Done But Isn't" Checklist

- [ ] **Course creation:** Questions are generated AND stored AND linked to a transcript excerpt — verify the DB has `transcript_excerpt` per question, not just the question text.
- [ ] **Quiz gate:** Pass/fail is evaluated server-side — verify by intercepting the client request and modifying the answer payload; the server must recalculate.
- [ ] **Private courses:** A logged-in user who is not the creator cannot access private course data via the API — verify with an integration test hitting the API directly, not the frontend.
- [ ] **Video unavailability:** A course with a deleted video shows a graceful message and does not block learner progress — test by manually setting `video_status = 'deleted'` in the DB.
- [ ] **Transcript unavailable:** Course creation UI surfaces a per-video warning when transcript fetch fails — test with a known video ID that has captions disabled.
- [ ] **Question generation failure:** If LLM call fails mid-course-creation (e.g., for video 3 of 5), the partial results are saved and the creator is told which videos need retry — test by mocking an LLM 500 error.
- [ ] **Quota logging:** Every YouTube API call and every LLM API call is logged with its cost — verify by creating a course and checking the log output.
- [ ] **Learner progress:** Progress persists correctly after browser refresh, different device, and session expiry — verify all three scenarios explicitly.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Quota exhaustion (YouTube API) | MEDIUM | Request quota increase from Google Cloud Console (takes 1-3 days to approve); implement request queuing to stay under the new limit; add monitoring to prevent recurrence |
| LLM hallucination discovered in live questions | HIGH | Add question flagging UI immediately if not present; identify all questions generated from same prompt/session; bulk-suppress flagged questions; trigger re-generation for affected videos; notify affected learners their progress on those questions is reset |
| Private course content leaked via ID enumeration | HIGH | Migrate all course IDs to UUIDs (DB migration + URL redirects); audit access logs for enumeration patterns; notify affected course creators |
| Transcript cache coherence failure (stale questions) | MEDIUM | Add `transcript_hash` column to question sets; backfill by re-fetching transcripts for all videos and comparing; flag question sets where hash doesn't match for re-generation |
| LLM cost spike from long transcripts | LOW | Implement token budget cap immediately; identify calls that exceeded budget via billing dashboard; no user-facing impact if questions were generated successfully |
| Video availability breaking active courses | LOW | Run one-time availability check for all videos in published courses; set `video_status` for unavailable ones; notify course creators in batch email |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Transcript unavailability (Pitfall 1) | YouTube integration / course creation pipeline | Integration test: add a video with captions disabled; verify graceful error UI and `transcript_status = 'unavailable'` in DB |
| Quota exhaustion (Pitfall 2) | YouTube integration / course creation pipeline | Verify zero YouTube API calls occur at student view time by reviewing network logs during course taking |
| LLM hallucination (Pitfall 3) | LLM question generation | Code review: prompt includes transcript excerpt; output schema includes `transcript_excerpt` field; temperature ≤ 0.2 |
| Gated progression lock-out (Pitfall 4) | Gated quiz mechanic | Test: manually fail gate 5 times; verify retry reset path exists and is reachable |
| Video deletion breaking courses (Pitfall 5) | YouTube integration (graceful degradation UI) + post-MVP background job | Test: set `video_status = 'deleted'` manually; verify UI shows graceful message and gate is suspended |
| LLM cost runaway (Pitfall 6) | LLM question generation | Test: add a 90-minute video; verify chunking fires and cost log is written |
| Course catalog privacy leak (Pitfall 7) | Course creation (ID scheme) | Integration test: User B cannot access User A's private course via API; URL uses non-sequential ID |
| Stale questions after video replacement (Pitfall 8) | LLM integration data model | Schema review: questions table has `transcript_hash`; replacing a video triggers invalidation |

---

## Sources

- YouTube Data API v3 official documentation (quota costs per endpoint): https://developers.google.com/youtube/v3/determine_quota_cost
- YouTube IFrame API known issues on mobile (iOS Safari): developers.google.com/youtube/iframe_api_reference
- OpenAI idempotency keys documentation: platform.openai.com/docs/api-reference
- LLM hallucination in factual QA: established pattern in ML literature (Maynez et al. 2020, "Faithfulness and Factuality in Abstractive Summarization") — grounding outputs in source text is the primary mitigation
- Edtech gating UX patterns: drawn from Duolingo, Khan Academy, and Coursera documented learner experience research (learner abandonment at friction points)
- YouTube transcript availability characteristics: known limitation documented in `youtube-transcript-api` Python library issues and developer community discussions

---
*Pitfalls research for: YouTube-based structured learning platform (YouCourse)*
*Researched: 2026-05-30*
