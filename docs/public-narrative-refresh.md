# Refreshing public stories under the narrative-first method

3 November 2026 · operational runbook

The refresh targets the active public website: dated reporting, public comparisons and the labelled historical walkthrough. It does not rewrite private investigations, saved analysis IDs, forecasts, source history or historical facts. Each assessment is published through the normal leased job and transactional publication functions; previous versions remain accessible.

## The current run

The starting inventory contained 153 public situations, including one walkthrough, and no structured lenses. All 13 configured feeds were then retrieved successfully. The bounded ingestion pass examined/queued 70 reporting items; unchanged idempotent jobs were reused. After changed reporting was published, the target set contained 154 public situations.

The durable manifest is `audit/narrative-refresh/manifest.json`. The initial public inventory and usage preflight are preserved alongside it. `status.json` reports results and limitations per target; `responses/` captures only this public refresh's provider request bodies and responses, without API headers or keys. These public-article artifacts support local auditing.

The normal background allowance was already exhausted. This explicitly requested refresh has a separate durable `refresh:<run-id>:…` reservation ledger, bounded by the manifest's finite target set: up to five model calls per target and a conservative reserved-unit allowance. Ordinary reader/background configuration and counters are not reset or raised. Private jobs cannot use this allowance. Provider-reported usage is recorded separately; reservations are not an invoice ceiling. The refresh retains the configured standard model and data mode. The database reservation buckets are per UTC day; the refresh runner refuses a new day’s allowance for the same manifest rather than silently reset its bound. A cross-day continuation needs an explicit cumulative-usage audit and remaining-budget reconciliation.

## Commands

```sh
npx tsx scripts/refresh-public.ts prepare
npx tsx scripts/refresh-public.ts run --limit=1
npx tsx scripts/refresh-public.ts run --concurrency=6
npx tsx scripts/refresh-public.ts status
```

During a controlled run, avoid duplicate processing fleets. Preparation initially requires an idle queue, retrieves reporting without queuing a competing research batch, and checkpoints the exact public target set. Run resumes jobs through the ordinary lease, heartbeat, retry and publication contract. It never marks jobs successful by hand. A prepared manifest cannot silently start another paid refresh.

Successful job completion is distinct from a supported reading, historical match or independent review. Inspect limited/failed results and sample actual claims and sources. The final report must state observed counts rather than assume every story deserves a lens.

## Defects exposed by the live pilot

- One assessment quoted a source outside its selected historical case; the existing gate rejected it. A later assessment used an unselected source in its historical sequence: publication correctly withheld it, but too late for the bounded repair step. Sequence and interpretation references now receive the same selected-case check before repair and additional claim review.
- Different hosts included a Wikipedia mirror. Known mirror/publisher origins and substantial text overlap now prevent obvious duplicate-account counting. These checks cannot prove full source independence.
- Some quotations did not support claims about motives, authority or stage. A separate model review can remove optional details, narrow claims using actual passages, or withhold a lens. Edited lenses pass provenance gates again. This is additional automated review, not an independent truth standard.
- Thin historical retrieval previously prevented final assessment. It can now produce a supported current-only reading while keeping the historical equivalent explicitly open.
- Invisible HTML word-joiners and surrounding quotation marks caused false missing-passage errors. Matching now ignores those layout/wrapper characters while rejecting changed or omitted wording. There is no fuzzy matching.
- A refreshed article reported a changed death toll while the card retained the older feed headline. Reporting now takes its headline from the retrieved article. A trusted headline-only job can version the already-read source title while preserving every reading/evidence field; changed evidence or private records are refused, and no model call is made.
- The first headline-only publication attempt hit snapshot deduplication because the fingerprint omitted the headline input. Existing analyses were preserved by the failed transactions. The snapshot recipe now includes its actual headline; a real one-story pilot verified publication and unchanged readings before the batch resumed.
- The first automatic feed run downgraded one researched story to a feed excerpt. Existing full-text stories now re-read the article and compare canonical source content before replacing their analysis. Routine public question wording, tracking parameters, source IDs and object-key order no longer invalidate unchanged readings; private questions, changed reporting and explicit reassessment still trigger investigation.
- Concurrent research exceeded earlier short model timeouts. Timeouts were extended while bounded calls and lease renewal remain active.

Research version `web-research-5` uses current-only planning, combined narrative/material/counterexample search, up to two assessment attempts, and additional claim review when a lens is proposed. Failed optional review withholds the lens while preserving a separately valid historical comparison. Missing topics may be classified by the assessment; source-provided categories remain authoritative.

Restart the API after shared-validator changes, and rebuild/restart the ordinary worker after the controlled run. Reload the browser to receive new latest-version IDs. Verify readiness, worker heartbeat, pagination, saved-version preservation and desktop/phone readings.

The run is complete. See the [verified refresh results](research/public-refresh-results.md) for counts, integrity checks, operating state and remaining product gaps.
