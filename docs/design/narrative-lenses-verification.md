# Structured narrative lenses: implementation verification

3 November 2026 · local development browser and compiled build

## Delivered increment

- A source-grounded pre-search planning step, recorded separately from the later historical assessment. Narrative hypotheses, material queries and countercandidate queries have distinct purposes. Actual executed queries remain inspectable.
- A versioned lens contract for actions, explicit framing, attributed roles, separately evidenced power, stage, current/historical observations, a competing reading and a consequential boundary.
- Optional projection, omission, symbol, counterpressure and grandiosity readings with observations, alternatives and limits. Projection/grandiosity additionally require a separate grounded observation. These checks do not establish psychological truth or semantic entailment.
- Feed features/cards surface a short lens payoff when present. The reader keeps the existing photograph-led design and three destinations: The reading, What to watch, Sources & limits. A second lens is selected explicitly and its selection survives tab changes and sign-in routing.
- Invalid optional lenses are withheld independently of a separately valid historical comparison. Current-only lenses cannot cite an unrelated historical case. A challenging/retracted observation suspends the prior structured lenses pending reassessment; immutable earlier versions remain available.
- Legacy payloads default to no structured lenses and retain their original presentation. No bulk regeneration, tracking collection, database migration, application dependency or model-limit increase was introduced.

The full scope and the fourteen requested reader benefits are documented in [the reader insight contract](../research/reader-insight-contract.md). The initial theory and accuracy audit are in [the research synthesis](../research/archetypal-narratives-and-validation.md).

## Actual checks

| Check | Observed result |
| --- | --- |
| Final strict TypeScript, tests and production build | `npm run check` passed. **37 tests, 0 failures.** [Captured log](../../audit/narrative-lenses/check.log). Existing non-blocking Node/Zod dependency warnings remain. |
| Search sequencing, using stubbed responses | Planner request precedes web-search request; planner sees current evidence without the stored historical case; valid plans persist; invalid plans are omitted while the independent search still runs. No real provider call occurs in this test. |
| Evidence rejection | Tests reject fabricated passages, wrong-side/current-versus-historical support, unread historical candidates, missing rivals, one-sided boundaries and illustration evidence. Projection/grandiosity cannot pass on a single repeated rhetorical passage. |
| Independent failure handling | Tests confirm a withheld invalid lens does not discard a separately valid factual match. Preliminary hypotheses alone do not become published lenses. |
| Version compatibility and challenge handling | Legacy snapshots parse without acquiring a new lens. Challenging observations suspend structured lenses without modifying the original version. |
| New reader layout | Fictional, explicitly labelled browser fixture shows the primary reading, role/power distinction, source disclosures, stage, alternative and boundary. This verifies presentation, not historical matching. |
| Desktop/phone reflow | Inspected at 1280px, 390px and 320px. No document overflow in tested states. Current-only and richer two-lens/symbol states also rendered successfully. |
| Source disclosure | The current observation's disclosure opens an exact supporting passage and original-source link. Deeper signal disclosure exposes observation, another explanation and limitation. |
| Keyboard navigation | ArrowRight moves from The reading to What to watch, changes the URL, selected tab and panel. Existing native disclosures remain keyboard operable. |
| Alternate lens and sign-in | The selected second lens persists through Sources & limits. Follow routes to sign-in with both `lens=2` and `view=sources` in the return path. No account was created. |
| No historical match | A current-only lens remains readable while the historical search stays explicitly open; it ends with what the reading cannot establish. No borrowed historical evidence is displayed. |
| Real stored story | The existing mogging/rizz comparison loads, a publisher photograph finishes loading (`naturalWidth > 0`), and legacy narrative interpretation remains a disclosure. No horizontal overflow or displayed errors. |
| Real Discover | The existing photographic stream still loads. The fixture feed feature separately exercises the new lens title and payoff. Fixture material is never written to the database. |
| Runtime | Development server and rebuilt worker are running; `/api/health/live`, `/api/health/ready`, and `/api/health/worker` returned 200. A read-only queue check found no queued/running jobs before the worker was started. Scheduled ingestion was not restarted as part of this validation. |

## Visual artifacts

[Desktop reader, fictional fixture](../../audit/narrative-lenses/reader-desktop.png) · [Phone reader, fictional fixture](../../audit/narrative-lenses/reader-mobile.png) · [Role/power detail](../../audit/narrative-lenses/role-power-mobile.png) · [Discover lens, fictional fixture](../../audit/narrative-lenses/discover-lens-fixture.png) · [Real Discover on phone](../../audit/narrative-lenses/discover-real-mobile.png).

The synthetic material is defined in `tests/fixtures/story-lens.ts`; the browser copy is in `audit/narrative-lenses/fictional-browser-fixture.json`. It is labelled fictional and only supplied through browser request interception. It is not a seed, live article, independently reviewed history or demonstration of model accuracy.

## Practical limits

No live paid generation or bulk reassessment was commissioned for verification. Successful real-provider generation of the expanded contract, latency, rejection rate and cost therefore remain unmeasured. The worker uses the rebuilt implementation for subsequent investigations; old saved/public snapshots have not been regenerated.

The new planner adds up to one budgeted model call. Fixed daily caps remain, so throughput may fall. A failed plan can fall back to independent historical search; no plan is then recorded for that version. Prompts request narrative/material/countercandidate paths; the trace records executed queries, but a separate lane-compliance evaluator has not been implemented.

First-pass search remains bounded. No software check establishes coverage of all history, representative collective beliefs, unconscious projection or predictive advantage. Outcome cohorts, image-transmission measurement, reader attention/blind-spot data and pattern-fluency assessment remain separate work. Independent historical/narrative evaluation and ordinary-reader comprehension tests are required before making those claims.
