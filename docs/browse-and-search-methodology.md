# Browse first, investigate broadly

> Narrative update, 3 November 2026: this is the original browse/search decision record. The [reader insight contract](research/reader-insight-contract.md) describes the first implemented increment of pre-search narrative planning, combined retrieval and structured lenses. The [research synthesis](research/archetypal-narratives-and-validation.md) explains the theory, initial audit and outstanding validation. Statements below about narrative interpretation following retrieval describe the earlier engine.

Working product contract, November 3, 2026. This supersedes the input-first home and the idea that a small approved collection is the limit of historical search.

## What the reader arrives for

The front door is a continuously refreshed reading stream: current reporting across world affairs, politics, business, technology, science, health, environment, culture, entertainment, sport and ordinary life. A reader can scroll, choose a category, open a story and inspect its historical connection. Bringing a link or description is a secondary entry into the same investigation.

News discovery and historical comparison are separate records of work. Reporting remains browsable while research is queued or incomplete. A failed analogy must not erase the underlying event. A category is an editorial navigation aid; it is not evidence that two events have the same mechanism. Categories must not generate psychological roles or decide the historical match.

Ingestion uses dated publisher feeds, canonical URLs, bounded excerpts and explicit source/category attribution. It rejects invalid dates and separates rolling live blogs from specific episodes. The stream orders by reporting time and uses pagination; analysis completion must not make an old story appear to be new news. Feed-level category attribution is visible as broad navigation, not a precise model judgment about the event. Reporting source availability and category coverage are observable operational facts.

## The search problem

“All of history” cannot be exhaustively indexed or certified: surviving records, languages, access, digitization and interpretations are incomplete. That does not excuse a tiny closed dataset. The product must actively search the wider historical record, accumulate what it learns, and disclose what it actually investigated.

Two questions are independent:

1. **Search coverage:** Which retrieval paths, queries, eras/regions and sources were actually examined? Was the search interrupted, blocked, budget-limited or too narrow?
2. **Correspondence quality:** Do the retrieved sources support useful relationships at the same stage of the event, and what differences could defeat the comparison?

A strong candidate does not establish exhaustive coverage. A thin search cannot establish historical novelty. A no-result state must distinguish “research incomplete” from “searched these sources; no defensible correspondence established yet.” Neither means that a parallel does not exist.

## Investigation sequence

1. **Freeze the present evidence.** Keep the source, publication/capture times and question. A reader description remains uncorroborated. Identify the observed action, relationships, stakes, constraints, available choices, stage and direction. Preserve uncertainty and negation.
2. **Retrieve from accumulated cases.** Rank qualified source-encoded episodes by connected, directed relationships and ordered groups. Keep the initial state separate from later outcomes. A local first-pass match needs a full-pair claim check, and is labelled without claiming a new web search. Explicit research reuse requires compatible source evidence, method, depth and corpus; routine unchanged feed polls preserve published readings while the backfill handles method migration.
3. **Expand beyond the collection.** Search the live indexed web for specific historical episodes. Use near precedents, more distant periods and a cross-domain countercandidate. Prefer archives, museums, libraries, scholarly/institutional histories and relevant primary documents; contemporary reporting can support recent history. Do not silently restrict history to one region or political canon. Query diversification is an instruction that must be audited against the actual query trace, not assumed to have happened.
4. **Verify retrieval actually happened.** A model's memory is a candidate generator, not a search record. Require provider search-call records and returned source URLs. A fabricated URL or a citation not present in the retrieval trace is rejected.
5. **Read and check evidence.** Fetch a bounded, safe selection of actual cited historical pages. Treat source text as untrusted data. Store source versions and verify exact support passages for each proposed mapping. Search snippets and model agreement are not independent historical verification. Blocked sources reduce coverage; they do not become pretend-read sources.
6. **Compare, including counterexamples.** Require at least three connected action kinds, two consistently mapped actors and two ordered groups, with source-supported comparisons and at least one consequential material difference. Compare alternatives. Similar nouns, broad tags and a dramatic ending are insufficient. Automatic quote checking proves that a passage exists, not that a causal interpretation is true.
7. **Publish at the warranted level.** Web-researched candidates remain distinct from source-checked editorial cases. One present-day article or a reader description normally supports a partial comparison, even when the historical side is well sourced. Sources located/read, candidates considered, actual queries, time and limitations appear with the assessment.
8. **Accumulate and correct.** Persist reusable researched case versions with their source record and automatic-review identity. Editorial review can promote a new version; it cannot retroactively make an earlier automatic assessment peer-reviewed. Refreshing evidence creates a new analysis. Saved preserves the old view; Following reveals changes.

The general research route must work outside the original small mechanism vocabulary. That vocabulary remains a conservative local fallback, not a gate that excludes entertainment, culture, science or ordinary events from wider research.

## Search failure and deeper work

Readers can request a broader search on a story or comparison. The next pass sees prior queries/candidates and asks for different periods, regions and mechanisms rather than repeating the same famous match. Depth is bounded and recorded. This is a new investigation, not an automatic upgrade in confidence.

Background work spans categories before spending its budget on several stories in one category. User-requested investigations take priority over background work and have a reserved request allowance. Daily model/search limits, bounded page fetches, timeouts, immutable publication and visible failure states keep a feed refresh from becoming uncontrolled paid work. Search context can materially increase provider token usage; reservations and actual reported usage must be distinguished.

The feed may contain reporting whose historical investigation is still pending. Its card must say so plainly. A partial comparison or research gap must not be presented as proof that Tether already found the globally closest parallel.

## Interpretation and prediction

Only after the comparison is assembled should Tether offer a Jung-inspired narrative lens, with observable support, a competing interpretation and a boundary against assigning hidden motives. The narrative is not used to increase retrieval rank or factual confidence. Its usefulness and forecasting contribution remain empirical questions.

Indicators express what would support, weaken or differentiate the comparison, which source could establish that observation and over what horizon. A historical ending is not a forecast. Numeric estimates belong in the separately timestamped forecast journal with fixed resolution criteria and immutable revisions.

## Evaluation before broad accuracy claims

Maintain two evaluation sets: broad story discovery/coverage and historical correspondence. Include politics, entertainment, health, technology, sport, routine events, non-Western cases, action reversals, ambiguous inputs and questions requiring cross-domain matches. Keep related event families together when splitting development and held-out sets.

Have independent reviewers assess candidate recall, useful correspondence, material differences, citation support, missed obvious precedents and appropriate uncertainty. Record disagreement. Compare local-only retrieval with expanded search under equal budgets, and measure the additional useful precedents and false connections. A developer regression suite is not this independent evaluation.

With ordinary readers, test whether browsing yields an insight, whether they can name a consequential difference, recognize an interpretation, and return to a changed story. Forecast value requires unknown-outcome, prospective comparisons against no-analogy and reference-class baselines. No passing software test can substitute for those studies.

## Current implementation (November 4, 2026)

`episode-research-7` implements library-first retrieval followed by bounded wider discovery; see [coverage expansion results](research/coverage-expansion-results.md) for actual publication receipts and limitations. Discovery keeps anonymous structure plus actor-scrubbed material clues. Candidate URL plans must be trace-backed and pair sources for the same episode. Historical HTML and bounded text PDFs are supported. A claim-rejected local reading receives one wider attempt; current extraction remains frozen. Ordinary Upvote/Downvote is the chosen reader feedback loop, not independent factual adjudication. The corpus-derived 70-check benchmark is expressly synthetic. No broader accuracy or all-history recall claim is established.
