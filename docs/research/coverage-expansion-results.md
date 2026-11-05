# Coverage expansion and reader feedback

Updated November 4, 2026. Implementation receipts live in `audit/coverage-expansion/`.

## Why the feed had one parallel

The baseline had 181 public reporting heads and one qualifying aligned comparison. The archive contained 254 active cases, but only two source-checked episode encodings, both versions of the same Ronin incident. Most records were reference leads or older research, not directed, source-anchored episodes usable by the new matcher. One visible result therefore described the system's coverage, not the number of possible historical parallels. Deleting old data would have discarded evidence without improving retrieval.

## Published changes

- Four public comparisons are available after this publication: the retained Binance/Ronin comparison, Canva/Best Buy, Ocon/Prost and the anonymous celebrity injunction/PJS. These last three are explicitly agent-curated, with source and structural checks; no independent historian or separate-model semantic review is claimed. Their selection was ranked against the 14-case encoded canon. Receipts: `audit/coverage-expansion/publications.json`.
- Fourteen reusable source-audited cases span 415 BCE–2016 and eleven topic domains. They include Magna Carta, the oil embargo, the US bank holiday, Montgomery, Gdańsk, PJS, Best Buy, the Sicilian expedition, Semmelweis, Minamata, the Salt March, the Moscow boycott, Prost/Ferrari and Reno v. ACLU. This is a small development corpus with substantial geographic and language bias, not broad historical completeness. Source independence notes, archival access limits and agent-authored summaries remain attached to the records.
- All 177 remaining public stories at enqueue time were scheduled for a new pass. That is a queue receipt, not 177 finished investigations. New reporting continues to arrive. Existing analyses and historical versions are retained.
- Each aligned comparison has Upvote/Downvote controls. Clicking the selected vote removes it. Optional reasons and notes remain available. Feedback is version-specific and readable only by the submitting session/account; it is not a public truth score.

## Retrieval methodology

`episode-research-7` freezes a source-checked current graph before historical discovery. It scans qualified episode encodings first, ranking by directed relationships, connected actors, resource kinds and order rather than vocabulary. A local first-pass match avoids a new web search but still needs a written reading and full-pair claim check. A rejected local reading makes one bounded wider attempt, excluding that candidate and reusing the unchanged checked current graph.

When the library is insufficient or a reader requests greater depth, discovery uses both an anonymous graph and actor-scrubbed material clues. The material terms help find candidates; they do not affect the final structural rank. Discovery requests a specific mechanism, a distant/cross-domain candidate and a countercandidate. The read plan preferentially keeps two sources about the same candidate together. Every planned URL must also occur in the actual search trace; older plain search responses have a bounded fallback. These instructions and source-origin heuristics do not guarantee diverse or independent results.

This separation of inexpensive candidate retrieval from structural comparison is informed by [MAC/FAC](https://www.qrg.northwestern.edu/ideas/macfac.htm). Tether does not implement MAC/FAC or SME, and this research does not validate our thresholds. The engineering gates remain at least three connected kinds of action, two consistently mapped actors and two ordered groups. They are reject rules, not accuracy measurements.

Historical acquisition accepts bounded HTML and text PDFs. The PDF parser runs in a terminated, memory-limited worker, using [unpdf](https://github.com/unjs/unpdf). DNS pinning, destination checks, redirect validation and time/size limits remain. HTML transcripts can use tables or lists. Scanned documents, publisher blocks and inaccessible pages remain coverage gaps. A short, labelled source audit summary is not presented as fully retrieved publisher text.

Known announcements cannot match completed historical actions silently. Canva and Best Buy compare announcements and changes in managerial discretion; no successful turnaround is inferred. The sports pair distinguishes a reported disagreement from an established dismissal motive. The privacy pair explicitly groups English courts functionally while naming the different court levels in the beats and material difference. No conclusion about the truth of allegations or the present claimant's identity is offered.

## Operations and integrity

Routine feed polling retains an unchanged published reading across archive/method upgrades. An explicit backfill or changed evidence triggers reassessment. The scheduler queues a bounded, idempotent public backfill every two-hour feed cycle. Older queued jobs referring to an origin analysis are also recognised, so new scheduling avoids duplicating them.

When ordinary daily research capacity is exhausted, the leased job returns to the queue until 00:05 UTC the next day. Failure retries are not consumed and the public head is retained. A separately checked current extraction can be checkpointed in that same job; a fingerprint and episode hash must match before reuse. Private evidence does not enter the public case library. The request page shows the resume time and reduces polling while waiting. No daily limits or closed pilot ledgers were reset or enlarged.

The linked migrations were applied with `supabase db push`; local and remote migration lists now agree. Database verification covers ownership, private access, quotas, immutable/atomic publication, feedback isolation, category mixing and capacity deferral. Database lint found one existing unused local variable in the quota function; it is not a runtime error. This was not a new managed Supabase security-advisor run, a restore drill or a production deployment.

## What has and has not been measured

The structural benchmark ran 70 checks over the 14 canon cases: known-structure recovery, vocabulary invariance, future-case rejection, single-action rejection and announced/completed separation. All passed, with 14/14 self-retrieval. Probes are derived from the corpus, not held out. This measures software invariants, not extraction accuracy, historical truth, global recall, usefulness or forecasting performance.

The user's chosen feedback loop is ordinary upvotes/downvotes. No reviewer panel or mandatory user study was introduced. Votes measure whether a reading helped. We do not report an independently measured historical-accuracy percentage. Separating these constructs follows the measurement discipline in the [NIST AI RMF Measure guidance](https://airc.nist.gov/airmf-resources/playbook/measure/); the guidance is not a certification of Tether.

`GET /api/coverage` and `/method#coverage` expose the actual public counts, seed corpus extent and synthetic check classification. Browser QA covered the published stories, article images, source/limits views, mobile reflow at 320 and 390 pixels, persisted vote changes and deletion. The test response was removed after verification.

## Remaining limits

The canon remains small and biased. Web discovery is capped at three proposals and eight pages per pass; indexed search cannot cover all surviving history. Page blocks, poor extraction and imperfect encodings can all hide good parallels. A pair's choice can still introduce bias, and one comparison cannot establish an archetype's universality or a recurring outcome frequency. No unconscious motive is inferred from a structural match. Representative held-out accuracy, culturally distant corroboration, symbol/projection/compensation measurements and forecast advantage remain unestablished. The correct next coverage work is more source-qualified episodes and measured retrieval failures, rather than weaker publication thresholds or deletion of old records.
