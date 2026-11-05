# Tether

Tether helps ordinary readers see possible recurring structures in current events by comparing two sourced accounts. Browse dated reporting across categories; qualifying comparisons show present and historical actions side by side before offering an interpretation. A concrete difference and a competing reading keep the comparison open to question. Historical breadth, interpretive accuracy and forecast value still require independent evaluation.

The front door is a visual, paginated discovery stream across categories, with publisher photographs, short takeaways and dated possible precedents. The reader has three destinations: The reading, What to watch, and Sources & limits. Bringing a link or description is a secondary entry. The app uses one versioned comparison from Browse through Saved and Following. It can say that the evidence or archive is insufficient. It does not claim to search all of history or assign validated system probabilities.

## Run locally

Use Node 24 and install the lockfile:

```sh
npm ci
cp .env.example .env.local
```

Set Supabase browser and service credentials in `.env.local`. The service key and optional model key are server-only. Do not put either in a `VITE_` variable. Apply migrations to your intended development project:

```sh
supabase link --project-ref YOUR_DEVELOPMENT_PROJECT
supabase db push --linked
```

Run the API/client and worker in separate terminals:

```sh
npm run dev
npm run worker:dev
```

Open [Tether locally](http://localhost:3000). Publish the source-backed historical walkthrough with `npm run seed:walkthrough`. For reporting, run `npm run enqueue:ingest` after building; or run `npx tsx server/scheduler.ts --once` during development. The long-running scheduler enqueues a refresh every two hours; it does not do analysis inside the HTTP process.

Supabase Auth supports email/password and optionally Google. Configure exact application callback URLs in your Supabase project. The browser uses the public Supabase key; the API independently verifies bearer tokens. Anonymous comparisons use a random HttpOnly session cookie and can be claimed by the same browser after sign-in.

## Production

```sh
npm run check
npm start
npm run worker
npm run scheduler
```

These are three separate services. `npm start` serves the built React app and bundled Node API. The worker claims durable database jobs. The scheduler can instead be replaced by a managed scheduler invoking `npm run enqueue:ingest` every two hours.

A multi-stage Node 24 `Dockerfile` and `compose.yaml` are supplied. Public browser configuration is needed at build time; server secrets are supplied at runtime. Compose reads `.env`; use a deployment-specific file rather than assuming `.env.local` is loaded by Compose. Configure HTTPS and `APP_ORIGIN`, and set `TRUST_PROXY_HOPS` only to the known number of trusted reverse proxies. Production session cookies require HTTPS; localhost HTTP is suitable for the development command.

- `/api/health/live`: process is alive.
- `/api/health/ready`: database and job schema can be read.
- `/api/health/worker`: a worker heartbeat was recorded within 90 seconds.

Database readiness alone does not mean a worker is processing jobs. Monitor all relevant checks. The administrator section of Profile displays durable jobs, explicit retry controls, resource reservations, and runtime heartbeats.

## Reader workflow

1. Browse current reporting, choose a category, or bring an event description/public article URL. Extraction rejects private network destinations, bounds redirects and page size, and asks for text when the publisher blocks access. Live blogs require a specific update.
2. Open a story and its historical connection. Wider investigations search live historical sources, read actual cited pages, compare explicit relationships and material differences, and record the search trace. Source-checked editorial cases, automatically web-researched cases and reference leads have different review depth. A reader can request up to three broader passes.
3. Save the exact version, follow the evolving situation, or refine it with newer material. Earlier versions remain available.
4. Add a sourced reader observation against a defined indicator. A public example forks into a private assessment; a link alone is not verification.
5. Optionally record a private forecast with fixed criteria, a closing time and a resolution source. Estimates remain auditable; revisions close at the deadline. Initial/latest Brier scores appear after resolution. Ambiguous questions remain unresolved.

Following updates appear in the app. Email/push notifications are not configured. Private situations require their owner or original anonymous browser; private forecast journals are never included in public reading responses. A public comparison link is shareable; a private link retains its access boundary.

A new aligned comparison has simple Upvote/Downvote controls; clicking a selected vote removes it. Optional notes are private to Tether and tied to that version. Votes measure usefulness, not factual truth. See `/method#coverage` for live publication and queue counts.

## Historical archive and review

The bundled corpus now adds 14 source-audited episode encodings spanning 415 BCE–2016 across eleven domains. These are agent-curated, not independently historian-reviewed or a representative sample of history. The initial energy precedents and legacy archive remain available. The existing archive is retained as reference material; its old categories are retrieval hints, not evidence of a verified mechanism. GDELT discovery imports remain outside supported comparisons.

A case contains its initial state, subsequent sequence, separate outcome, material boundaries, source versions and an optional narrative lens. The accumulated archive is a retrieval path, not the boundary of history. The earlier `episode-research-8` route source-checks and freezes the current episode before searching. It checks source-encoded case memory first. Wider discovery receives an anonymous relationship graph and actor-scrubbed material constraints; material terms help discovery but do not affect structural ranking. A local match is labelled as a library check, not a new web-wide search. Historical episodes use the same typed schema and receive a separate source-only semantic review. The bounded matcher ranks directed, connected actions and ordered adjacent windows; names, topic vocabulary, outcomes and archetype labels do not affect that ranking. Original records, original reporting/analysis or scholarly history must support the matched historical actions. Two source domains alone do not establish corroboration. A final claim review may still withhold the reading. Legacy lexical retrieval remains in earlier assessment paths, not the new structural ranker. There is no operational embedding/vector retrieval path in this version.

To extend the archive, prepare a review JSON document with `historicalCase` (the schema in `src/lib/comparison.ts`), `reviewer`, `reviewedAt`, `notes` and `support`. Each support record names a `signal`, `sourceId` and exact `passage` from a stored source summary. A source-checked case requires support for every signal and at least two distinct publishers. Publisher count does not establish source independence; the named review must assess that separately.

```sh
npm run archive:case -- --validate /path/to/review.json
npm run archive:case -- --publish /path/to/review.json
```

Publication is a service-authorized editorial action. Case versions are append-only and duplicate versions are rejected. Automatically researched public stories can accumulate reusable historical cases with an explicit automatic-review identity; private investigations do not contribute to that public memory. A new editorially published version supersedes the prior case in future retrieval. Its archive fingerprint invalidates reuse of an unchanged request; saved comparisons retain their original case evidence. The CLI validates structure and citations, not historical truth. See [the review protocol](docs/review-and-evaluation.md).

Legacy `seed` and `gdelt:*` commands remain available for archive research. Their generated classifications do not grant source-checked status. Legacy generation/feed endpoints return HTTP 410 so stale clients cannot publish contradictory judgments.

## Verification

```sh
npm run check        # strict TypeScript, semantic/security regressions, production build
npm run test:db      # linked project: transactional checks; fixtures roll back
```

For a disposable local Supabase stack, use `supabase db query --local --file supabase/tests/living_comparisons.sql`. CI includes this local-database job and a production startup smoke without credentials.

The full integration smoke requires a configured API, worker, seeded walkthrough and service credentials. It creates a disposable `tether-smoke-…@example.invalid` account, exercises guest isolation, authorization, saved/followed versions, observations, history, private forks, and forecast closure, then deletes its fixtures:

```sh
SMOKE_BASE_URL=http://127.0.0.1:3101 npx tsx scripts/smoke-api.ts
```

The service must be running on that URL. These tests verify software behavior; they do not establish historical recall, usefulness for ordinary readers, or forecast advantage. The current evidence gate is conservative engineering, not an independently measured accuracy rate.

The product/search contract is in [browse and search methodology](docs/browse-and-search-methodology.md). See [implementation status](docs/implementation-status.md), [operations](docs/operations.md), [the first-principles review](docs/first-principles-review.md), and [the original delivery plan](docs/first-principles-implementation-plan.md).

The current form-factor decisions and primary research are recorded in [visual discovery research](docs/design/visual-discovery-research.md), with actual browser and production checks in [visual discovery verification](docs/design/visual-discovery-verification.md).

The narrative-centred increment and all fourteen reader payoffs are specified in [the reader insight contract](docs/research/reader-insight-contract.md), with [theoretical research and the initial audit](docs/research/archetypal-narratives-and-validation.md) and [implementation verification](docs/design/narrative-lenses-verification.md). Existing immutable payloads remain unchanged; public reporting without a new aligned pair opens source-first, with a previous-method lens available in a labelled disclosure; source-passage checks do not establish psychological truth. Personal attention profiling, historical outcome cohorts and population-wide narrative measurement are not implemented.

## Comparison-led reader and current quality gates

See [research and publication decisions](docs/research/comparison-reader-and-quality.md) and [live pilot results](docs/research/episode-pilot-results.md). The default browse mix uses the latest public story in each available category from the past seven days, followed by deduplicated chronological pagination. It never fills empty categories with invented stories.

Complete ordered-episode comparisons require three connected action types across at least two ordered groups, two consistently mapped actors, compatible resources, source-qualified history and automated claim checks. These are engineering gates, not a validated accuracy score. A failed search remains open. Exact excerpts, source summaries, programmatic access limits and automated review are labelled. Feedback is private, deletable and attached to the exact comparison version; usefulness does not adjudicate factual truth. The controlled pilot has a separate lifetime ledger and cannot reuse the completed v5 refresh budget.

## Coverage expansion operations

The [coverage implementation report](docs/research/coverage-expansion-results.md) records corpus provenance, publication receipts, synthetic checks and remaining limits. `npx tsx scripts/backfill-public.ts --enqueue --limit=12` schedules an idempotent public reassessment; `--status` reports aggregate progress. The scheduler also enqueues a bounded backfill each feed cycle. Existing data is retained. Capacity waits preserve the public head and resume automatically under the unchanged daily limits. `npx tsx scripts/benchmark-structure.ts` regenerates the synthetic regression artifact; its results must not be described as independently measured historical accuracy.

## Narrative model and corpus maintenance

`/patterns` presents the fixed cast, dynamics and stages, with hover/focus/touch definitions. Symbolic observations are optional, source-anchored readings, not personality or collective diagnoses. The [model and maintenance report](docs/research/narrative-model-and-maintenance.md) records lineage, implementation and measured gaps. `/method#coverage` shows the encoded archive grid with domain/dynamic filters.

One scheduler polls feeds every two hours, adds up to five demand-driven expansion investigations per UTC week, and schedules up to two source rechecks a day for public source flags or cases due after 90 days. Passing rechecks append case versions and queue affected public heads for reassessment. Page-access failures and verification disagreements are parked. Shared daily limits remain unchanged; no human-review workflow is required. Use `npx tsx scripts/canon-maintenance.ts --index-public-gaps` to index existing eligible public gaps, `--enqueue` to run scheduling, and `npx tsx scripts/evaluate-canon.ts` for the explicitly internal leave-one-out probe. It currently finds zero cross-case structural matches among the 14 seeds; do not call this accuracy, global recall or saturation.

## Outcome-led narrative comparisons

The default pipeline is now `narrative-research-12`. It types and abstracts the current account before history, retrieves source-encoded historical records and checks an explicit actor mapping, shared constraint and response. Context matches distinguish mechanism, framing and power relationships; they do not claim a complete ordered action sequence. The earlier typed matcher remains a separate method. Source-only historical records include a documented result where the source establishes one. Every new eligible assessment also searches beyond the small library when web research is configured. Deeper passes try additional contexts within larger explicit bounds. A separate claim check can withhold the reading after one bounded correction.

The reader sees the earlier result, today’s question and the consequential difference as a connected path. Evidenced dynamics are visible and their terms have hover, focus and tap definitions in prose. Each historical case has its own version-specific private usefulness vote. [Reader incentives](docs/design/reader-incentives.md) explains the shared design contract and the remaining event-continuity gap. [The example and refresh review](docs/research/narrative-refresh-2026-11-04.md) records actual findings and limitations.

The controlled refresh is resumable through `scripts/refresh-narrative.ts`; its durable ledger lives in `audit/lens-refresh-9`. `recover` only releases expired leases from that run after checking that its recorded processes are gone. Paid stages share a process lock; a `pause` file stops new admissions while in-flight work drains. Model traffic uses a separate bounded HTTP/1.1 connection pool: controlled probes found default HTTP/2 completions queuing on a shared session. Reservations and observed usage remain cumulative; aborted calls have unknown usage, not a presumed refund. Provider timeouts are retryable execution failures and preserve existing readings, rather than being reported as evidence of no historical parallel.


The [cross-context implementation report](docs/research/cross-context-implementation-2026-11-05.md) records the historical-distance, identity, causal-fit and retrieval repairs. Structural ranking examines the eligible encoded library up to its stated bound before selecting candidates; an ad-hoc tag top-eight is no longer the admission bottleneck. Dates and source-backed identity checks gate publication. The showcase avoids repeating one earlier episode, while the complete news stream remains available. These checks are not an independently measured accuracy score.
