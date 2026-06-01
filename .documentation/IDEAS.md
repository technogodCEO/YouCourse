# YouCourse — Ideas & Strategic Notes

Unvetted ideas, long-horizon thinking, and strategic observations. Nothing here is planned or committed — it's a place to capture thinking before it gets lost.

---

## MCP Server

Build a YouCourse MCP server that exposes the generation pipeline as tools any MCP-compatible agent can call.

**Why it's interesting:** An MCP is essentially the API product (sell tokens for platform access) but in a format immediately usable by Claude, Cursor, and other agents — without needing to build a full REST API, docs, or SDK first. Lower barrier to get something in developers' hands.

**Potential tools to expose:**
- `search_youtube_for_learning(topic)` — returns ranked videos for a learning objective
- `generate_curriculum(topic, depth)` — returns an ordered lesson plan
- `create_course(topic, depth)` — full pipeline, async with status polling
- `get_course(courseId)` — returns structured course data with questions

**The YouTube search angle:** if the search + ranking logic gets genuinely good, it's a defensible primitive on its own — sellable independently of the full course pipeline. Many apps would pay for "find the best YouTube video for this learning objective."

---

## Claude + YouCourse Integration

A YouCourse MCP would make Claude a direct interface to the platform. A student asks Claude "teach me computer architecture" — Claude calls YouCourse, gets back a structured course with videos and quizzes, and hands the learner a full learning path. Claude becomes the interface, YouCourse becomes the engine.

This is philosophically aligned with the sequential + extended thinking premium pipeline: Claude is already a chain-of-thought reasoner, and the premium pipeline mirrors that architecture. The integration isn't bolted on.

**Distribution upside:** if Anthropic ever features community MCPs in Claude's interface, a YouCourse tool that any Claude user can enable to turn any topic into a structured course is significant organic distribution — no marketing budget required.

---

## Anthropic Models for Premium Sequential Pipeline

Claude Opus/Sonnet with extended thinking is the natural fit for the sequential generation architecture:

- Lessons processed one at a time, each call receiving prior lessons + questions as context
- Extended thinking lets the model reason about course arc before generating — "what does the learner already know, what are they about to learn, what questions bridge those two things"
- Output: questions that build on each other, escalating difficulty, no redundancy across lessons
- Transcript is still the content ceiling, but extended thinking extracts more signal from it

**Tradeoff:** slow (several minutes for a long course) and expensive (Opus is ~100x Scout's cost). Acceptable for a high-ticket premium tier where quality is the explicit selling point. Not for free or standard users.

**Pipeline design principle:** build model-agnostic improvements first (longer transcript context, multi-pass refinement, curriculum editing before video search). Then evaluate whether Anthropic models extract meaningfully more from the better pipeline than `gpt-oss-120b` or Maverick would. If the gap is small, save the cost.

---

## Topic-Level YouTube Search Cache

Normalize lesson topic strings and cache `(videoId, title, durationSeconds)` in a `videoSearchCache` table keyed by topic. If two courses generate the same lesson topic (e.g. "Python for loops tutorial"), the second course never hits the YouTube API.

Estimated 70-80% API call reduction at scale — important for staying within quota and controlling SerpApi costs if we switch providers. Low implementation cost, high leverage at scale.

---

## YouTube API Quota Strategy

Current default: 10,000 units/day (100 units per search.list call = ~30-100 course generations/day).

For formal release, target 10M+ units via Google's compliance audit + quota extension process. Key points for the audit form:
- API called once per lesson at creation, cached permanently — never called per student view
- Topic-level cache (above) will further reduce actual calls vs. generation volume
- App complies with YouTube ToS: video IDs stored, users directed to YouTube player, no content rehosting

**Fallback:** SerpApi's YouTube engine as an alternative/overflow provider. Clean JSON, fraction of a cent per call, drop-in replacement for `searchYouTubeVideo()` in `src/lib/youtube/search.ts`.

---

## OpenRouter as Unified Provider

`@openrouter/ai-sdk-provider` gives access to 300+ models behind one API key — drop-in replacement for `@ai-sdk/groq`. The real value is for tiered pricing: free users on Scout via Groq, pro/premium users on any model via OpenRouter, without managing multiple provider packages.

Switch when introducing tiers. Not worth the added latency and markup for single-model use.
