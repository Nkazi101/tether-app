# Review and evaluation protocol

Updated November 3, 2026. This separates implemented checks from evidence that still needs to be collected with independent reviewers and ordinary readers.

## Case publication

A review JSON contains `historicalCase`, `reviewer`, `reviewedAt`, `notes`, and `support`. The case schema is in `src/lib/comparison.ts`; the validator/CLI are `server/domain/case-review.ts` and `scripts/publish-case.ts`. Source IDs must resolve, support passages must be present in the stored summaries, stages and boundaries are required, and source-checked cases require at least two publishers and support for every declared mechanism signal. Validate before publishing:

```sh
npm run archive:case -- --validate /path/to/review.json
npm run archive:case -- --publish /path/to/review.json
```

The reviewer must separately assess identity and episode boundaries; sources' independence and institutional perspective; initial conditions versus known endings; factual support for chronology, actors and mechanisms; consequential differences; and plausible contrary interpretations. A source-summary check is not a causal validation. Preserve disagreement and uncertainty in `reviewNote`. Name the review process honestly; do not use a model or tool count as an independent historian identity.

Automatic web-researched cases remain `web-researched`. They cannot become `source-checked` just because quote lookup or publisher-count checks passed. A new editorial version is needed. An earlier analysis retains the earlier evidence/review status. Source or narrative corrections create new versions rather than editing the past.

## Historical-search evaluation

Create a frozen event-snapshot set across all browse categories, including entertainment, ordinary life, non-Western settings, difficult cross-domain analogies, recent precedents, action reversals, weak inputs and obvious counterexamples. Record the source cutoff and task question. Group related event families before reserving held-out material.

Before tuning, have at least two independent reviewers propose and assess useful candidate episodes. Record disagreements and adjudication instead of treating one famous answer as uniquely correct. Evaluate local-only retrieval, accumulated automatic memory and expanded web search under comparable budgets. Measure candidate recall against the reviewed set, useful relationship mappings, material disanalogies, quote/citation support, missed obvious parallels, false connections, coverage/failure reporting, latency and actual usage. Prespecify numeric release criteria and sample sizes before examining held-out results; no universal accuracy threshold is assumed here.

The repository's regression tests cover demonstrated semantic failures, polarity, unsupported strong claims, invalid citations, search-call provenance, chronology, publisher breadth, safe ingestion, immutable observations, scoring and publication boundaries. Live probes demonstrate that broader source-backed retrieval can run. Neither substitutes for the independent evaluation above.

## Browse and reader evaluation

Ask ordinary readers to browse without first providing a question. Check whether a category contains current reporting, dates/source attribution are understood, and a research-pending card is distinguishable from a published connection. Include mobile users and people with little historical knowledge. Test category navigation, long scrolling, reopening a story, save-versus-follow, an incomplete investigation, a changed assessment and a broader-search request.

After reading, ask for the precedent, two useful relationships, a consequential difference, an uncertainty, and what observation would matter next. Compare with an ordinary cited explanation under the same time budget. Do not count pleasant prose or agreement with the reader's politics as comprehension. Use observed behavior and follow-up use to assess return value; pricing and demand require separate evidence.

## Prospective forecasting

The private journal records fixed question/criteria/source/deadline, immutable estimate revisions and evidence-backed resolution. Ambiguous outcomes remain unresolved. Initial/latest Brier scores include errors, but a single resolved question does not establish skill.

For a predictive product claim, register unknown-outcome questions and compare no-analogy, reference-class, one/multiple-analogy and archetype-assisted conditions using matched model/retrieval budgets. Prespecify resolution, horizon, ambiguity/cancellation handling, aggregation, scoring, calibration, and uncertainty across independent events. Historical replay is useful debugging but cannot prove absence of model knowledge of the ending. Report misses, unresolved questions, costs and topic differences. Retain the understanding benefit even if no forecast advantage is found.

No independent reader study, adjudicated held-out corpus evaluation or prospective forecasting study was completed during this implementation.
