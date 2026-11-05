# Tether implementation plan

Prepared November 2, 2026. This is the delivery sequence for the [first-principles review](/Users/nkazi/Documents/tether/docs/first-principles-review.md). It prioritizes ordinary readers seeking insight and preserves access to deeper evidence for researchers and professionals. This is the original delivery plan. Implementation status is tracked in [the delivery record](implementation-status.md). The later [browse-first and broader-search contract](browse-and-search-methodology.md) supersedes the input-first home and a closed-corpus interpretation of retrieval.

## Product contract

Every published comparison must answer: what happened; which precedent is useful for which question; what specifically corresponds; which difference could change the implication; what remains unknown; and what new evidence would change the assessment.

The same versioned analysis must drive discovery, search results, comparison detail, saving, following, and sharing. Unknown evidence remains unknown. An attractive explanation must not upgrade a tentative comparison.

Release states should distinguish at least: input needs clarification, retrieving, comparison under review, supported comparison, partial comparison, insufficient evidence, stale, and failed. Forecast and review status are separate fields. Human review should name the reviewer or process; automatic thresholds must not imply human review.

## A. Contain the demonstrated failures

| Work package | Change | Acceptance evidence |
| --- | --- | --- |
| A1. Authorization | Protect profile authorization data on both insert and update; use an admin-controlled relation or explicit column grants plus guarded writes | With real local authenticated roles, a user cannot become admin through direct Data API writes, metadata, alternate endpoints, or owner-row updates; legitimate profile editing still works |
| A2. Truthful quality states | Remove automatic strong-match defaults on missing assessments; remove positional percentages; suppress generic generated facts and unsupported likelihood labels | Every input mode can return insufficient evidence; the observed bad pairings cannot acquire a strong label from category overlap alone; response schemas contain no invented percentages |
| A3. Cost and request limits | Bound text/URL input, concurrency, retries, output tokens, per-session/user usage, and shared spend; create jobs through POST | Oversized input is rejected before model/database work; exhausted shared budgets stop work consistently across processes; retries are bounded and recorded |
| A4. Production package | Pin runtime, build server and client artifacts, define environment requirements, separate worker startup | A clean production build starts successfully and serves both app and API; liveness/readiness distinguish process health from database/provider readiness |
| A5. Correctness probes | Preserve the observed strike/Union/negation failures as semantic regression cases | The classifier preserves action direction and uncertainty, or abstains; no category-to-persona feedback can turn these inputs into verified historical matches |

A2 should initially reduce the number of confident results. That is an acceptable consequence of correcting unsupported claims. Keep useful sourced context visible so the reader understands what is known and how to refine the question.

## B. Establish a reliable event and analysis foundation

Introduce stable situation/event IDs, immutable snapshots, source versions, and claims. Keep timestamps for the event, source publication, retrieval, and analysis separately. Store actor relationships and observed actions rather than an ambiguous list that mixes entities, institutional positions, and persona labels.

Build one typed analysis result with input mode, normalized question, current-event snapshot, evidence cutoff, case versions, candidate kinds, comparison rationale, claim support, material disanalogies, status, and provenance. Use runtime schemas at HTTP, database, and model boundaries.

Migrate by adding the new objects alongside existing tables. Backfill identities and provenance, compare old/new reads, then switch one surface at a time. Preserve saved items with explicit mappings and keep old analysis versions available. Do not merge historical episodes solely because their titles normalize to the same string.

Create a durable job pipeline with separate API and worker entry points. The scheduler enqueues; workers claim with a visibility/lease mechanism. Each stage has idempotency keys, bounded retries, a failure state, and an operator retry path. Commit event relationships and publication pointers transactionally. A job log must not report completion before its output is fully committed.

Cache only immutable derived results or explicitly stale read models. Include evidence, case, retrieval, prompt, schema, and model versions in the identity. Let clients poll or subscribe to the specific job result. A background job finishing must become visible without requiring a reader to discover a refresh workaround.

Acceptance: two differently titled reports of the same situation can update one stable event; a live blog can produce separate supported episodes; interruption during writes preserves the prior published view; restarting a worker resumes or retries work safely; two workers do not double-publish; title changes preserve links and saved history; failed jobs do not become completed analyses.

## C. Make historical comparison defensible

Start with a bounded reviewed corpus selected from the existing archive. Repair provenance and source links before scaling imports. For substantive causal claims, prefer multiple genuinely independent sources, including contrary interpretations when relevant. Exceptions must expose their limitations rather than receive an arbitrary high score.

Each case should have a versioned initial state or stage, subsequent events, proposed mechanism, constraints, material differences, and outcome observations. Outcomes remain separate from the text used to match a present-stage query. Define the case’s boundaries so a century-long transformation is not silently treated as the equivalent of a week-long announcement.

Create a labeled evaluation set before changing ranking. Include useful near matches, decisive mismatches, ordinary non-dramatic events, missing coverage, disputed evidence, new phenomena, cross-domain analogies, negations, and the actual audit failures. Reserve some events and related event families from tuning. Use independent reviewers and record disagreement.

Prototype retrieval as a union of lexical, semantic, mechanism/relationship, and temporal-stage candidate searches. Reciprocal-rank fusion is a reasonable baseline; its weights are evaluation parameters, not truths. Diversify candidates so several near-identical famous cases do not crowd out an informative alternative. Consider recent precedents alongside distant ones.

Reranking must produce explicit correspondences and a meaningful disanalogy. Verify the support for those assertions. A second model pass can critique, but two model opinions are not independent factual sources. The acceptance layer must also check source sufficiency, input certainty, and unresolved contradictions.

Separate GDELT discovery candidates from reviewed case IDs throughout retrieval, persistence, and presentation. Discovery leads may appear as leads; their generated mechanism/persona labels do not count as verified structure. Automatic enrichment should queue editorial review rather than automatically satisfy the evidence gate.

Acceptance: the held-out set shows an improvement over the current method in supported correspondence and false-strong-match rate; no foreign-key failure occurs for a discovery candidate; missing coverage produces an understandable abstention; adding unrelated archive rows cannot increase an individual match’s reliability; deliberate action reversal changes the interpretation; material claims expose usable support. Set numeric release thresholds before examining the final held-out results, with sample sizes appropriate to the claim.

## D. Deliver the first complete reader experience

Make event input and a few reviewed current examples the home experience. Support text and actual article URL extraction. For URL ingestion, bound size, redirects, timeouts, accepted schemes, and network destinations; reject access to local/private infrastructure and require safe handling of retrieved instructions. When content is unavailable, ask for relevant text instead of inferring the article from its URL.

Publish a short first explanation with one primary parallel, the shared pattern, the difference that matters, date/status, source access, and a next observation. Let readers expand the evidence, alternatives, and archetypal interpretation. Keep important limitations in the initial view. Make a good historical parallel recognizable without requiring technical vocabulary.

Represent narrative interpretation separately: observable role; supporting behavior; possible behavioral hypothesis; archetypal story; competing frame. Show it in ordinary language, with optional depth and attribution to its intellectual sources. Avoid assigning motives because the person occupies a generic institutional role.

Create one analysis page for mobile and desktop. Pair corresponding steps on mobile; align them on desktop. Preserve accessible source access, keyboard navigation, readable text, and clearly marked dates. Saving should store an analysis version, with an explicit option to follow future changes. Account creation should follow demonstrated value.

Acceptance: ordinary readers can identify the precedent, explain why it helps, identify a difference, distinguish a fact from an interpretation, and say what evidence matters next. Include a no-result task and a changed-assessment task. Test alongside the current app and a plain cited explanation. Treat 150–250 words, a small example set, and navigation labels as hypotheses to validate.

## E. Complete the original vision with Following and divergence

Add explicit indicator definitions with an observable condition, source, observation cadence, horizon, ambiguity rules, and the scenario/assumption they affect. Start with a few indicators per situation. Distinguish failure to observe from evidence that an event did not occur.

New reports update claims and indicators. They should trigger reassessment when a material assumption changes, not regenerate all prose on every ingestion. Record whether the update changes facts, mechanism correspondence, narrative interpretation, candidate choice, scenario plausibility, or forecast probability.

Give the reader a short change explanation, the affected part of the old assessment, source access, and the next condition to watch. Maintain the previous version and record corrections. Notify only when the user opted into a channel and the change is meaningful; unchanged monitoring stays quiet.

Acceptance: a simulated new observation can strengthen one branch, weaken another, invalidate the primary analogy, or leave the assessment unchanged. The UI shows the actual reason and prior version. A rerun does not send duplicate updates. A retracted report can retract or revise dependent claims. Delivery failures do not affect publication correctness.

## F. Establish a measured forecasting service

Create a forecast journal with explicit question wording, outcome definition, horizon, evidence cutoff, resolution source, ambiguity rules, estimate author, and immutable revisions. Keep private user forecasts private. System probabilities are a separate capability from scenario generation.

Run prospective comparisons between the same base model/retrieval budget with no analogies, a reference class, one analogy, multiple analogies, and independently annotated archetypes. Evaluate Brier/log scores where appropriate, calibration, topic and horizon performance, abstention, cost, and uncertainty across independent situations. Prespecify how revisions and cancellations count.

Historical replay can debug the pipeline and identify apparent failure modes. It must not be presented as proof that a language model did not know the ending. Forward unknown-outcome questions are required for the predictive claim.

Acceptance: forecasts resolve consistently from their written criteria; earlier revisions remain auditable; score reports include misses and unresolved questions; no forecast is rewritten after its result; any claimed advantage is supported on held-out prospective data with uncertainty. If historical comparisons improve understanding but not forecast performance, retain that understanding value and narrow the forecast claim.

## G. Operate and expand responsibly

Instrument source lag, ingestion failure, job age, retry count, abandoned work, publication freshness, claim support, corrections, evaluation regressions, model usage, and cost per accepted analysis. Record provider token usage and latency where available. Reserve enough capacity for user-requested work independently of background enrichment.

Use separate development/staging/production configuration and credentials. Add CI for the production artifact, meaningful API contracts, local RLS/grant checks, job interruption/idempotency, temporal caching, and retrieval regression data. Verify backup retention and perform a restore drill before claiming recoverability. Review actual deployment logs, provider limits, and bills; none was available to establish a cost or reliability baseline in this assessment.

Keep the current generative provider behind a small typed interface. Measure its contribution on the task before changing providers, adding a fallback, fine-tuning, or operating a local model. Generation and embedding capabilities need not come from the same provider. Reuse classified evidence and case representations to control cost without replacing missing analysis with generic assertions.

Expand the corpus according to actual reader questions, documented gaps, reviewer capacity, and evaluation results. Add languages and regions with appropriate sources and review. Add native distribution, collaborative commentary, expert publication, or an API only when the core loop works. Treat pricing and willingness to pay as separate user-research questions.

## Immediate next delivery

The first implementation should combine A1–A5 with a single end-to-end supported comparison built on the new contract. Use the gas-supply misclassification as a required regression and a carefully sourced supply-dependence case as a positive example. Include a refusal/insufficient-evidence result and one manually supplied observation that visibly changes the comparison. This makes the central promise testable before a broad interface rebuild or archive expansion.

The success criterion is straightforward: a regular person gains a useful insight, can see why it might be wrong, and can return to find out what changed.
