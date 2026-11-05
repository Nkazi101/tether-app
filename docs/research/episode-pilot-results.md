# Comparison-led implementation: results and limits

November 3, 2026, America/Chicago (November 4 UTC). This is an implementation and source audit, not an independent accuracy study. [Research and publication decisions](comparison-reader-and-quality.md) contains the supporting primary research and its limits.

## What changed

The browse page opens with dated, attributed reporting and publisher imagery. Its category mix takes the most recent available public story in each of twelve categories from the preceding seven days, then continues with chronological pagination. The mix and pagination are deduplicated by situation ID; sampling does not alter the chronological cursor or skip its unseen stories. Category pages stay chronological. The method explanation follows the stories. This editorial order is intended to offer more entry points than a politics-heavy recency feed; improved engagement is still an untested hypothesis.

A comparison badge and featured position now require an actual validated aligned pair. All reporting without one opens source-first. Previous-method lenses remain in a labelled disclosure, with old immutable payloads retained. Older analyses do not silently acquire the new method's authority. Explicit opinion/review/live URL conventions are labelled; unknown genre remains unclassified.

The comparison reader shows ordered Now/Then groups before the interpretation, then a consequential difference and, where supported, a separate later historical chapter. Competing readings, actor correspondences and selection limits are available through named disclosures. On phones each present-day group is immediately followed by its historical counterpart. Exact excerpts open beside the relevant statement; programmatic page-access limits are disclosed there as well as in Sources & limits. Missing historical imagery stays typographic; no synthetic documentary images were created.

## The method now running

1. Encode the current report into actors, resources, directed actions, attributed claims and chronological moments. Run a separate current-source semantic check and freeze the checked episode before history enters the model context.
2. Give discovery an anonymous graph of functional relationships, not the current headline, actor names or source prose. Search for a connected mechanism, a distant context and a countercandidate. Keep recorded queries and actual page reads distinct from mere search results.
3. Qualify historical source origins. At least one original record, original reporting/analysis, or scholarly history must support the matched historical actions. Two domains alone are insufficient. Automated source-origin classification needs an exact identifying passage; a recorded agent source audit is separately labelled.
4. Encode historical candidates in the same typed schema, then source-check those proposals without supplying the current event. Only then rank the graphs.
5. Require three distinct connected action types, at least two ordered groups, two consistent actors and compatible resources. A group may join up to two adjacent moments; known chronology cannot reverse, and unmatched padding cannot count. Separate early strands may survive until a later action connects them, but the completed graph must be connected. Search remains bounded to a beam of 48 and 24,000 explored states per case.
6. Write a short shared reading, sourced consequential difference and competing interpretation. Run a final claim review. An unsupported optional future inference can be removed without erasing established history; a failing core claim withholds the pair.

These are engineering gates, not evidence of accuracy. The matcher is inspired by relational analogy research; it is not the published Structure-Mapping Engine. A model can still encode a false relationship, miss context or select a biased candidate. Exact excerpt occurrence is not proof of entailment, independent corroboration or historical truth. There is no exhaustive-history or predictive-performance claim.

## What the real pilot established

Eight selected public stories were processed through versioned jobs. After targeted source and representation repairs, one has a source-qualified published pair:

[Binance fake-job account / Ronin bridge theft](http://localhost:3000/comparisons/857d8b04-8d00-4d47-b5da-1e0f6716ea3a).

The match uses the reported sequence of employee deception, compromised access and removal of funds. It aligns two of four current moments with three historical moments in two ordered groups. The current restoration and attribution dispute remain visible outside that partial alignment. The historical FBI attribution remains an attributed agency statement, not proven identification of the attackers. The break distinguishes the unrevoked signing authority in Ronin from the current account's internal-AI access path; the analogy cannot establish which safeguards would stop the current attack.

This example used a recorded agent source audit and agent-edited reading followed by automated checks. It does not demonstrate unattended end-to-end editorial quality. Its final candidate set contained one episode; it is not a demonstration of broad historical recall or cultural diversity.

Historical evidence:

- [The Block's original reporting](https://www.theblock.co/news/regulation/2022-07-06-how-a-fake-job-offer-took-down-the-worlds-most-popular-crypto-game-156038), based on two anonymous sources and partly quoting the operator's postmortem.
- [Elliptic's contemporaneous analysis](https://www.elliptic.co/insights/540-million-stolen-from-the-ronin-defi-bridge/), including its tracing work but partly relying on the operator for the technical account. These publishers do not independently corroborate every technical detail.
- [The FBI's April 14 statement](https://www.fbi.gov/news/press-releases/fbi-statement-on-attribution-of-malicious-cyber-activity-posed-by-the-democratic-peoples-republic-of-korea), primary evidence of the agency's attribution.

The research browser could read The Block and Elliptic, while the programmatic article reader could not obtain sufficient text. Their stored summaries are explicitly agent-authored, with separate short exact-quotation registries. Those paraphrases cannot pass as publisher quotations. The original operator postmortem URLs returned 404; direct access is not claimed. The FBI page was programmatically fetched.

The other seven pilot stories have no new published pair. Some were inapplicable or thin; others failed representation, ordering or claim gates. This small, repeatedly inspected sample cannot estimate precision, recall, abstention accuracy or unattended yield. An open comparison is a retrieval/evidence/representation limit, not a finding of historical novelty.

The pilot caught and addressed:

- Prose grouping creating false negatives: adjacent windows now tolerate grouping while preserving known order.
- Premature rejection of separate strands: a regression test failed before the correction and passes afterward; final connectivity remains mandatory.
- A nonsensical historical edge: an engineer receiving an offer had been encoded as adopting the funds later stolen. A source-only historical review corrected the actor/action relationship before matching.
- Attribution becoming established action: the reviewed historical graph separates an unidentified attacker from the agency's allegation.
- Retrospective commercial guides being mistaken for sufficient historical evidence: they are now leads, not the sole foundation for a new pair.
- Awkward prose and unsupported future inferences: the new plain-language contract rejects stock/poetic abstractions, and claim review can omit an unsupported optional inference.
- Cached encoding being mistaken for reviewed evidence: reuse now verifies the unchanged current source fingerprint, frozen current hash, original reviewed database snapshot and exact historical episode. A copy-edit attempt stopped before a provider call when that proof was initially missing; the corrected attempt supplied the retained database snapshot.

A subsequent ordinary background job also ran fresh provider discovery, source-origin triage, historical encoding and historical source-only review. Its trace is recorded in `audit/episode-pilot/final-audit.json`. It withheld a pair. That verifies execution of the normal search path, not its retrieval quality.

## Persistence, operations and verification

The pilot used a separate lifetime ledger: **64/64 model-call reservations**, 2,718,742 reserved units and 1,375,666 provider-reported observed tokens. It did not reset at midnight or reuse the completed v5 refresh ledger. There are 22 succeeded pilot jobs, zero queued/running pilot jobs, and one explicitly superseded job marked failed before execution. A successful job can correctly publish an open comparison. No further pilot calls are authorised by this exhausted ledger.

Four migrations add private versioned feedback, a derived aligned-head browse index, the ordered-window feedback method and the bounded category-mix function. Feedback identity, access and exact case/alignment versions are server-derived. Guests can save, update and delete their own response; direct anonymous/authenticated table access is revoked and RLS is enabled. There are no public usefulness counts or accuracy scores. The client-reported exposure flag is not proof of reading or a blind comprehension test.

Verification completed:

- 78 automated tests; TypeScript check; production build.
- Linked database checks for authorization, private access, quotas, leases, atomic publication and immutable versions; fixtures rolled back.
- Linked RLS/grant assertions for feedback, plus bounded category-mix tests for public scope, recency, per-category uniqueness and latest eligible selection.
- Real desktop reader and browse checks; 390px and 320px reader checks with no horizontal page overflow. Now/Then order, image loading, evidence, competing reading, actor/method disclosures and unmatched developments were inspected.
- Real guest feedback saved, reloaded and deleted on published comparisons. No QA feedback rows remain for those versions.
- Previous-method reporting opens source-first with its old interpretation in a labelled disclosure. The fixture-only QA tab was closed; the user's original tab was preserved.
- API live, readiness and worker health returned HTTP 200. Ordinary worker and scheduler were restored from the current build. The resumed feed poll reported 13 successful feeds, zero failed feeds, and work queued across eleven named topics.

The migrations were applied directly to the linked database. Existing migration-history drift has not been reconciled; these checks do not establish a clean `db push` deployment workflow. Previously identified unrelated advisor warnings remain documented in the earlier audit. The workspace's pre-existing changes were preserved; no reset or commit was made.

## What still blocks the full promise

The largest gap is a broad, source-qualified, independently reviewed historical corpus and held-out evaluation. The accumulated automatically encoded archive is not that canon. Next corpus work should encode 20–30 carefully reviewed pilot cases across eras, regions and domains, then measure retrieval recall separately from published-pair precision against vocabulary decoys, reversed actions, disputed actors and real abstentions. A deliberately distant second case should be tested rather than added as decorative confirmation.

Projection, compensation, grandiosity and collective-pattern claims require observable, symmetrically applied criteria and suitable evidence. This implementation does not establish hidden motives, collective unconsciousness, universality, population-wide symbol trends or forecast advantage. Personal attention profiling and long-term pattern fluency are not implemented.

A full uncached investigation with unqualified source origins takes eight model calls before repairs. At the unchanged 60 background calls/day, that supports roughly seven such investigations, often fewer. Better accessible archives, reviewed reusable episode graphs and targeted review are therefore operational priorities. Reserved units estimate submitted prompt bytes and output allowance; provider-managed search can report more actual tokens than that reservation. The separate observed-token ledger records this, but the reservation cap is not a provider billing guarantee. Reconciling search overruns and enforcing a provider-side spending ceiling remains an operational gap. Raising spend alone would not fix weak source acquisition or representation. The browse feed can be broad while comparison coverage remains sparse; the interface must make that difference visible.
