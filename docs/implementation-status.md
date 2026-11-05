# Tether delivery record

Updated November 3, 2026. The [browse/search methodology](browse-and-search-methodology.md) is the current product contract. It supersedes the original input-first home and the assumption that a small approved collection bounds historical search.

## What is implemented

| Area | Delivered behavior |
| --- | --- |
| Browse first | Current publisher reporting, category shortcuts, published connections, original source dates, twenty-item keyset pages, continued scrolling, and an optional bring-your-own-story form. Reading preferences can prioritise featured topics without changing factual conclusions. |
| News foundation | Thirteen publisher feeds across eleven categories; canonical URLs; HTML/entity cleanup; valid-date and age checks; bounded text; topic-interleaved ingestion; initial reporting available before research. |
| Broader historical search | Accumulated-case retrieval plus actual live web search through the existing Meta provider; explicit search-call verification; actual page reading; multiple candidate episodes; source/passage checks, chronology and multiple-host gates. The general route does not require membership in the original narrow mechanism taxonomy. |
| Search accountability | Versioned search method, actual queries, source counts, candidate names, captured time, depth and coverage limitations accompany an assessment. Up to three reader-requested passes preserve prior versions. A failed/thin search is incomplete research, not proof of historical novelty. |
| Evidence and interpretation | Paired present/past passages, case initial state and separate outcome, material differences, alternatives, unknowns, and a separate Jung-inspired narrative lens. Automatic research remains partial and explicitly differs from independent historical review. |
| Temporal handling | Comparable historical episodes must precede the present evidence. Wider research identifies developing versus retrospective/unclear reports. Future-looking indicators are suppressed when their event timing has not been established. |
| Living assessments | Stable situations, immutable evidence/analysis versions, explicit change explanations, defined indicators, reader-reported observations, private forks of public work and accessible history. |
| Saved and Following | Saved points to the exact chosen version; Following tracks the situation's latest assessment. Observations do not overwrite saved versions. Completion invalidates reader caches; the reading desk polls for updates. |
| Forecast journal | Private questions with fixed criteria/source/deadline, immutable estimates, late-revision rejection, evidence notes and initial/latest Brier scores after resolution. No system probability is invented. |
| Archive growth | Append-only reviewed case publication CLI; indexed automatic public case memory; explicit automatic review identity. Private investigations do not automatically contribute to public memory. All legacy case IDs remain distinct; a missing taxonomy mapping does not silently discard a case. |
| Authorization and privacy | Verified bearer identity, isolated anonymous session ownership, sign-in claims, owner-scoped API reads/writes, private journals, hardened profile role grants and guarded role writes. Auth-account deletion cascades private work and submitted sources. |
| Durable operations | Separate API, worker and scheduler; persisted jobs and quotas; leases, heartbeats, bounded retries, idempotency, atomic publication, reader priority and separate background request capacity. Administrative status, explicit new attempts and case quarantine are visible. |
| Production foundation | Node 24 target, separate built server/client/worker artifacts, working production start, Docker/Compose definitions and CI configuration for application/build/startup/dependency and disposable-database checks. |

## Verification performed

The strict TypeScript check, 22 automated regression tests and production build pass. The production artifact has been started and exercised locally. The dependency audit records zero reported vulnerabilities at the time of this check.

Rollback SQL checks against the linked project pass for genuine-role privilege escalation, private-table/function access, ordinary profile editing, quota rollback, enqueue idempotency, expired leases, atomic publication, immutable versions, and cascading deletion of private source/job data. Fixtures and temporary grants roll back.

The full API smoke passes anonymous isolation, sign-in claims, role escalation rejection, ordinary/admin operations boundaries, saving/following, immutable observations/history, private public-story forks, broader-search version/ownership, forecast closure/resolution and account cleanup. The script creates only a disposable synthetic account and deletes its fixtures. Its latest evidence is [the API smoke artifact](../audit/implementation/api-smoke.json).

Live ingestion successfully read all thirteen configured feeds and populated all eleven categories. Browse checks cover disjoint keyset pages, category attribution/filtering, published-connection selection and invalid parameters. The counts are observations from the test, not a completeness claim about worldwide news. See [browse smoke](../audit/implementation/browse-smoke.json).

A live historical-search probe located music/distribution precedents across multiple periods, read actual historical pages and produced two checked correspondences outside the seed energy cases. Search calls and usage were verified against the provider response. See [the broader-search probe](../audit/implementation/open-history-probe.json). This demonstrates that the route works; it is not an independently judged recall or accuracy score.

Mobile browser verification at 390 px shows a single-column reading stream with no document-width overflow. Category browsing and opening a real researched entertainment story were exercised. Desktop/default-size verification and screenshots accompany the audit artifacts.

## Failures found and corrected during implementation

The original operational weaknesses included a production TypeScript startup failure, editable authorization data, in-memory pipeline state/budgets, conflicting analysis paths and unsupported confidence/actor defaults. The new runtime contains the corresponding fixes rather than leaving the old generator behind a redesigned interface.

End-to-end testing found that claiming guest work could leave a job reference blocking account deletion, and that globally deduplicated source rows could retain private submitted text. Sources are now situation-scoped; related job ownership transfers on claim; retained result references do not block cleanup.

Saved items initially opened the latest version, and observation publication could replace a saved pointer. Both were corrected. The original saved version remains fixed unless the reader explicitly saves another version.

Wider retrieval exposed a corpus-poisoning failure: different historical URLs could redirect to one page, producing duplicate source IDs. A generated case with that defect made archive reads fail. Page deduplication, publication validation and durable case quarantine now isolate that record. A regression test covers this failure. Forty-four affected system jobs were requeued as new attempts while preserving the original failure history; all forty-four repair attempts subsequently completed. A completed job can publish an explicitly incomplete investigation and does not imply that a parallel was established; see [recovery record](../audit/implementation/quarantine-recovery.json). Published earlier assessments remained available.

RSS descriptions from some sources were encoded twice. Decoding is now bounded and removes markup/scripts as text processing. Actual URL extraction also exposed a Node address-family mismatch; pinned DNS connections now specify the validated family and were exercised against a public historical page.

## What is not established or delivered

No exhaustive-history guarantee is made. The archive, indexed web, surviving sources, languages, source access, model selection and bounded budgets all limit search. Automatic passage matching does not establish entailment, causal transfer or independent source agreement. A plausible historical explanation still needs independent historical/subject review before broad accuracy claims.

No independent reader study, adjudicated held-out correspondence evaluation, willingness-to-pay study, or prospective forecast experiment has been completed. Those protocols are in [review and evaluation](review-and-evaluation.md). The initial reviewed source pack remains small; the implementation now searches beyond it and accumulates public research instead of treating that pack as sufficient coverage.

The interface shows in-app updates. Email/push delivery, collaborative editing, native-app distribution, automated live-blog segmentation and system-calibrated probabilities are not implemented. Live blogs require a specific update; ambiguous forecast outcomes remain unresolved. These are explicit scope boundaries, not hidden substitutes for the core browse/search loop.

Internet-facing hosting has not been deployed. Docker execution was not verified because the available local daemon did not respond. CI workflows are supplied, but their hosted results have not been observed here. No backup/restore drill, provider invoice audit or external uptime-monitor setup was completed. A server retention policy for expired guest work and a reader-facing account deletion screen also remain to be decided/implemented; the existing administrator/Auth deletion path was tested.

The managed Supabase inspection retains the intentional own-profile/RLS advisory and disabled leaked-password protection advisory. The demonstrated profile role escalation itself is fixed. Deployment and recovery details are in [operations](operations.md).

## Visual discovery revision · 3 November 2026

Discover now leads with publisher photography and a visual present/precedent pairing. Completed cards show a short takeaway; unreviewed leads keep a separate label. The reader exposes the connection and its first material difference immediately, with source evidence, history, human-pattern interpretation and forecasting one clear step away. Saved and Following reuse the visual cards. No historical evidence snapshot was rewritten to obtain imagery.

The image pipeline preserves RSS and article metadata for future reporting. A bounded cosmetic resolver supplies existing snapshots; private media access uses the same ownership checks as the underlying comparison. The obsolete reader was removed, and shared comparison tools live in `src/components/ComparisonTools.tsx`. There were no database migrations or new packages for this revision.

See [research and design decisions](design/visual-discovery-research.md) and [verification](design/visual-discovery-verification.md). These describe the new layout; the earlier design reports remain a record of prior iterations.
