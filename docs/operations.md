# Operating the versioned Tether application

Updated November 4, 2026. The new schema is additive: existing history, GDELT research imports, profiles and bookmarks remain. Legacy generation endpoints are retired. The runtime no longer uses the monolithic background pipeline. The browse/search methodology is in [the current product contract](browse-and-search-methodology.md).

## Process model and recovery

The API validates input, authenticates access, creates a durable job and returns HTTP 202. It serves immutable published comparisons while work is pending. A separate worker claims jobs using `FOR UPDATE SKIP LOCKED`, a lease token and a visibility deadline. User work has priority over system ingestion. A scheduler only enqueues idempotent two-hour slots.

A worker renews its lease every 30 seconds. A crashed worker's job becomes available when its 180-second lease expires. Attempts are bounded at three. A stale lease cannot publish. Publication locks the situation and verifies the previous version; sources, snapshot, analysis, observation, latest pointer, relevant Following entry and successful job result commit in one transaction. Earlier versions are never edited. Conflicting writers retry against the latest published state rather than silently replacing it.

An administrator can queue a new attempt from Profile. The original failed job remains in the log; the new job consumes the normal allowance. Input errors, unavailable/blocked article text and unsafe URLs are terminal for that request and ask the reader for better input. Model failure falls back to conservative evidence extraction; it does not invent a replacement explanation.

Check:

```sh
curl --fail http://localhost:3000/api/health/live
curl --fail http://localhost:3000/api/health/ready
curl --fail http://localhost:3000/api/health/worker
```

The worker and long-running scheduler record heartbeats every 30 seconds. A one-shot managed scheduler records its run rather than a continuous heartbeat. The worker endpoint expects a heartbeat within 90 seconds. Database readiness is intentionally separate from worker availability so existing reading remains serviceable during a worker outage.

## Deployment

Build with Node 24 and `npm ci && npm run check`. Run `npm start`, `npm run worker` and `npm run scheduler` as separate supervised processes, or use the supplied container/Compose configuration. A managed two-hour scheduler may replace the scheduler process. Supply server credentials only to server processes; browser public configuration is compiled during the build.

Set the exact HTTPS `APP_ORIGIN`. Configure only known trusted proxy hops; incorrect proxy trust can defeat IP allowances. Keep `SESSION_HASH_SECRET` stable across replicas. Rotating it invalidates guest access and changes the IP hashes used by daily limits. Signed-in ownership uses the verified Supabase user ID. Do not deploy development Vite middleware publicly.

Migrations must be applied before the new worker/API. They revoke client access to private operational tables and functions, restrict profile authorization columns, and add a trigger that rejects role escalation even if a future migration accidentally grants the column. New case, runtime and analysis tables have RLS enabled and no anonymous/authenticated Data API privileges; the API performs explicit ownership checks using its server service role.

The production Node artifact was built and started locally. This work has not deployed an internet-facing hosting service. The container definition was reviewed but not run: the available local Docker daemon did not respond. CI's disposable local Supabase job is supplied; its hosted CI result must be observed after pushing the code.

## Limits and resource accounting

Defaults are 12 guest requests/day, 40 user requests/day, 100 requests/IP/day, 1,000 reader requests/day globally and at most three queued/running requests per owner. System ingestion has its own global allowance, so it cannot consume the reserved reader allowance. All counters are durable and shared by replicas. Enqueue idempotency does not reserve usage twice. Failed quota transactions roll back every counter.

Optional model extraction has a shared 120 calls/day and 6 million conservatively reserved token units/day ceiling. The local extractor reserves UTF-8 input bytes plus output. Wider research reserves 100,000 units for search context and a separate bounded comparison allowance. Search context is billed too; these reservations are conservative estimates rather than an invoice ceiling. Background research has its own 60-call sublimit, and actual provider-reported usage is recorded separately. This is a conservative control, not an invoice or actual token count. Call duration, response status, accepted/rejected extraction and reported token usage are logged without source text or credentials. Meta's reasoning tokens count against output limits; the earlier narrow extraction helper uses 1,800 output tokens. Wider research bounds its search response to 3,000 output tokens and its comparison to 5,500, with explicit reasoning effort. See [Meta's reasoning documentation](https://dev.meta.ai/docs/cookbook/reasoning-thinking-tokens).

These limits bound requests and model work, not every infrastructure expense. The implementation did not inspect provider invoices, subscription entitlements or cloud bills. Set actual limits using the environment variables and observe accepted-analysis cost before increasing volume.

Input text is bounded to 12,000 characters; JSON bodies to 32 KB. Articles allow only HTTP(S), standard ports and no embedded credentials. Every redirect is validated; all DNS results must be public; the connection is pinned to a validated address and family. Requests bound DNS resolution, response headers, duration, redirects and body size. Unreadable pages return a paste-text instruction. Retrieved text cannot invoke tools or change the extraction instructions.

## Data ownership, preservation and deletion

A guest's random 256-bit cookie is HttpOnly, SameSite=Lax and Secure in production, with a 30-day browser lifetime. The database stores its HMAC owner identity, not the cookie. The same browser can claim private guest work after signing in; job ownership transfers too.

Saved points to one analysis version. Following points to a stable situation and exposes the newest assessment. A reader observation on public work creates a private situation with a traceable public origin. Reader observations remain reader-reported even when they include a URL. Forecasts are filtered by user and situation; their immutable revisions cannot be changed after closing. Public reading never includes private journal data.

Deleting an auth account cascades owned situations, sources, snapshots, analyses, observations, reading entries, jobs, forecasts and forecast revisions. Source rows are situation-scoped so submitted text is not left in a global deduplication table. Non-owned job result references use `ON DELETE SET NULL`, preventing them from blocking account cleanup. This behavior passed both rollback SQL checks and a disposable-account API test.

There is no automatic deletion policy for expired guest work or aggregate usage metadata in this release. The 30-day cookie lifetime is an access lifetime, not a server retention promise. Set a deliberate retention policy before inviting broad public use. Private research is never automatically inserted into the public case library. Account deletion is currently an administrator/Auth operation; a reader-facing account deletion screen is not implemented.

Do not run `supabase db reset --linked` against a data-bearing project. The linked SQL verification script wraps all fixtures, temporary grants and counters in a rollback transaction. The full API smoke creates and deletes only its synthetic account and job IDs. Its artifact records whether cleanup completed.

## Monitoring and response

Use Profile's administrator operations to inspect recent failures, attempts, runtime heartbeats and quota reservations. Logs have structured event names (`job-completed`, `job-failed`, `worker-store-unavailable`, `model-extraction`, `model-extraction-rejected`, `reporting-ingestion`, `scheduler-enqueue-failed`). Forward these to the hosting platform's retained logs; no external monitoring account or notification channel was configured here.

When jobs stop completing, inspect worker health and database connectivity first. Restart the worker and allow the existing lease to expire; do not mark jobs successful by hand. If the provider is unavailable or expensive, set `ANALYSIS_MODEL_ENABLED=false` and restart workers. If a feed fails, ingestion keeps earlier published readings and records partial or complete source failure. Current browse feeds are BBC/BBC Sport and Guardian across 11 categories; earlier NPR readings remain preserved; copied reporting is a discovery excerpt, not full-article verification.

When a historical source or interpretation needs correction, publish a new reviewed case version. Reassess affected situations with newer evidence; never edit the old snapshot. Explicit research requests check archive/method compatibility. Routine feed polling retains an unchanged public reading across corpus upgrades; the versioned backfill handles that migration without erasing existing evidence. Existing saved versions remain historical records, including their original limitations.

The post-change Supabase security inspection left two managed advisories: intentional authenticated visibility of the RLS-protected own-profile relation and disabled leaked-password protection. The role-column escalation defect was closed. Leaked-password protection is a managed Auth configuration/entitlement item and was not represented as fixed.

No backup retention inspection or restore drill was completed. Before making recovery guarantees, establish the intended deployment project, confirm its backup/PITR coverage and restore a copy into an isolated environment. Software rollback means reverting application code while preserving the additive schema and private-access protections; it does not mean reviving the retired generation endpoints.


## Browse and broader research

Ingestion publishes dated reporting first and queues wider investigations across categories. Initial reporting jobs precede background research, while reader work has highest priority. The stream orders by source reporting time using an indexed keyset cursor; completing an analysis does not make older news newly reported. RSS excerpts are decoded as text and retain their retrieval kind. Wider investigation attempts full current-article extraction before relying on a feed excerpt.

The research service ranks source-encoded memory first. It performs wider live discovery when local coverage is insufficient, a local reading is rejected, or greater depth is requested. Search-call records verify that discovery occurred; a trace-bound read plan pairs sources for specific candidates and safely reads up to eight historical HTML/PDF URLs. The directed matcher checks three connected action kinds across at least two ordered groups and two consistently mapped actors. Source and full-pair claim checks can withhold a result. It publishes a partial web-researched assessment, never an automatic historian-reviewed or globally closest claim. Failure leaves an explicit incomplete-coverage state and preserves earlier versions. Search traces are stored with the comparison. A reader-requested investigation of public work creates a private assessment.

Public automatic case memory is append-only and indexed for full-text retrieval. Its review identity is explicitly automatic. Publisher count is not proof of independent sourcing. A private investigation stays in the private analysis and is not contributed to the public memory. Live search and page reading have latency and provider costs; set HISTORICAL_SEARCH_ENABLED=false to stop the live search path or ANALYSIS_MODEL_ENABLED=false to stop optional model research entirely.

## Quarantined cases and repair

Archive reads validate stored case versions. Invalid versions are recorded in `tether_case_quarantine` and excluded from both paginated case retrieval and indexed research leads. A failed quarantine write is a real store failure rather than an invitation to loop over the same record. Publication validates the complete case before adding it to automatic memory; multiple URLs redirecting to one page are deduplicated first.

The administrator view lists quarantine reasons and version IDs. Preserve the bad immutable record for diagnosis, publish a corrected new version, and queue new attempts for affected failed jobs. Do not clear failures or claim completion by changing status fields by hand. The implementation exercised this recovery after detecting duplicate historical source IDs; the new attempts and original IDs are recorded in the audit directory.

## Cosmetic publisher imagery

`GET /api/media/feed` supplies a fixed-source RSS image index (15-minute refresh, concurrent refresh deduplication, 1,500-item bound). Source reads have time and body-size limits. If all feeds fail, the resolver retains the last successful entries and retries after one minute. Cards also accept imagery preserved by new reporting ingestion.

`GET /api/analyses/:id/media` checks comparison ownership before resolving its publisher image. The article-image cache is bounded to 300 entries, successful results to one hour and misses to five minutes; no more than eight distinct resolutions run concurrently. Article retrieval retains DNS pinning, private-network rejection, redirect and body limits. Only explicitly allowed HTTPS image hosts are embedded. A missing image is a cosmetic fallback, not a failed assessment.

These process-local caches are reconstructible and do not hold evidence ownership, job state, saved versions or research results. Restarting a service may discard them safely. Image resolution does not invoke a model or charge the research quota. The browser caches the shared feed index for fifteen minutes and resolves detail imagery separately from the immutable evidence snapshot.


## Narrative-first public refresh

The one-off [public data refresh runbook](public-narrative-refresh.md) records the controlled refresh, scoped usage ledger, preservation of existing versions, and real-provider findings. Research version `web-research-5` can retain current-only readings when historical retrieval is thin, perform one bounded assessment repair, and run an additional model claim review. Edited lenses still pass provenance checks. Known mirror origins and substantial text overlap cannot qualify as independent historical corroboration; invalid stored case versions are quarantined through the existing mechanism. Normal daily allowances are unchanged.


## Current comparison-led pipeline

`episode-research-8` is the processor default. [Publication research](research/comparison-reader-and-quality.md) records the structural and source standards; the [coverage expansion report](research/coverage-expansion-results.md) records the current corpus, retrieval, feedback and evaluation. Fourteen source-audited episode cases supplement the existing library. They are not a representative global canon or independently reviewed gold set. The three new editorial comparisons explicitly identify their agent curation. The earlier [bounded pilot](research/episode-pilot-results.md) remains closed: do not rerun or reset its exhausted 64-call lifetime ledger.

All local migrations through `20261104144234_resumable_research_checkpoint` are applied and listed remotely after a successful linked `db push`. Run the living-comparison, feedback, discovery-mix and coverage-backfill SQL tests. These fixtures roll back. Database lint currently reports one existing unused local quota variable. A managed security-advisor rerun and backup restore test were not performed in this change.

The scheduler adds at most 12 public backfill requests per two-hour cycle. `npx tsx scripts/backfill-public.ts --enqueue --limit=200` can queue a bounded initial pass; `--status` exposes aggregate public progress. Stable keys include method, canon edition, situation and reporting fingerprint. Old research jobs that refer to an origin analysis also prevent duplicate scheduling. Do not delete old analyses or case versions to refresh coverage.

Normal background/global model limits remain unchanged. An eligible cold library match needs four calls before repair (current extraction/check, reading/check), or two when the current graph is safely retained. A full cold web investigation can need eight calls before repairs. One rejected local reading may additionally trigger one wider pass. Search tool tokens can materially exceed prompt-size reservations; monitor observed usage separately. No token count here is a price estimate. With 60 background calls/day the initial queue cannot finish in one day.

Capacity exhaustion returns the leased job to `queued`, sets its availability to 00:05 UTC the next day and restores its failure-attempt count. A checked current graph can be stored in that job's payload and reused only after matching its evidence fingerprint and episode hash. Existing public heads remain published. The request API exposes a resume time and the reader UI reduces polling during the wait. This mechanism is service-role only; it does not put private work in shared case memory.

`GET /api/coverage` exposes aggregate public progress, the bundled canon extent and explicitly synthetic regression results. It exposes no private jobs, source text or feedback notes. Upvote/Downvote usefulness feedback remains owner-scoped, version-specific, reversible and separate from factual accuracy. No independent reviewer workflow is required.

## Versioned model and maintenance

See [the November 4 model/maintenance report](research/narrative-model-and-maintenance.md). The single scheduler also indexes demand through system-owned public gap records, schedules at most five weekly gap-cluster investigations and at most two daily case checks. Cases become due after 90 days; public source-issue flags can bring a check forward. A blocked source or withheld verification parks the attempt. Fresh source-only encoding and a separate check can publish a new version only under a valid `system:canon` job lease, using `tether_complete_canon_check`. Publication then queues public heads using that case for idempotent reassessment. A completed-check retry resumes propagation without re-encoding. Existing snapshots stay immutable. No reader identity or feedback note enters the public gap log.

Apply `20261104152137_demand_driven_canon` and run `supabase/tests/demand_driven_canon.sql`. RLS and direct-client revocations protect both maintenance tables and all maintenance RPCs. A linked advisor run reports 14 existing warnings in earlier profile, curation and GDELT policies and managed Auth configuration; none targets the new maintenance tables. It is not an all-clear for legacy infrastructure.

The application now attaches the development websocket to the HTTP listener rather than a second port. Shutdown closes idle HTTP connections and Vite. Watch exclusions prevent audit, build, test, backend and browser-log writes from reloading the reader. The production route still serves the built frontend without Vite.
