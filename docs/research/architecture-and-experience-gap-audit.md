# What the current app represents—and what the clarified product requires

3 November 2026 · implementation audit during the public data refresh

## Assessment

Tether has functioning news ingestion, versioned publication, evidence access, a narrative-planning prototype and an interface for structured lenses. It does **not** yet implement the central architecture in the user's latest description: equivalent present/past narrative encodings, explicit structural alignment, a reviewed story canon, a comparison-led discovery experience and a reader-quality feedback loop.

The earlier implementation descriptions need a distinction: providing a schema, prompt and UI for an insight does not establish a working, reliable detector of that phenomenon. Source-passage checks and additional model review are safeguards. They do not establish historical, psychological or predictive accuracy.

The completed public refresh improves the evidence base and produces initial readings; it does not close these architectural gaps. The verified results are recorded below and in the refresh report.

## The operating pipeline

| Requirement | Current representation | Missing work |
| --- | --- | --- |
| Event ingestion and applicability | Thirteen configured feeds across eleven categories; date/length/live-page/duplicate checks; article extraction with attributed feed fallback. | Event-level clustering and an evidence/applicability gate before expensive research. A coherent event packet needs actors, a relationship or decision, a trigger, stakes and enough sequence evidence. A category alone cannot decide eligibility: a routine forecast and a flood that exposes institutional failure differ. |
| Narrative extraction | Current-only hypotheses before historical search; source-attributed roles; separately evidenced power; optional current stage; present/past observations and a provisional pattern code. | A consistent representation of conflict, stakes, trigger, turning point, causal/temporal beats and changing relationships. Historical cases need the same representation. This is currently largely model-driven extraction with checks, not a validated narrative parser. |
| Structural analog retrieval | Local ranking combines mechanism signals and lexical overlap; lead retrieval uses text; wider search receives narrative, material and counterexample queries; a model proposes correspondences. | An explicit matcher of role relationships and beat order between equivalently encoded episodes, with auditable mappings, violations and alternative candidates. The current path is not simply embedding search, but it is also not that structural engine. |
| Juxtaposition | Current article/photo, earlier case, paired evidence, historical sequence, shared explanation, alternative and material boundary. | Aligned, readable event beats that expose the shared shape before naming it. Current UI leads with an authored insight; historical sequence is optional. This reverses the comparison-led experience in the latest reframe. |
| Human feedback and learning | Saves, follows, reader observations and a personal forecast journal. | A version-specific usefulness rating, reasoned challenge, optional reader-written shared pattern, exposure-aware metrics and a reviewed improvement loop. Saves/clicks are not a substitute for illumination or correctness. |

Older foundation types also contain `actorRoles`, `structuralSummary` and numerical fit fields. The active archive adapter currently imports structural prose as a retrieval lead and does not turn those fields into a shared beat/role graph. Dormant fields and seeded scores should not be counted as an operating structural matcher.

Evidence: [comparison schemas](../../src/lib/comparison.ts), [lens schema](../../src/lib/story-lenses.ts), [local ranker](../../server/domain/compare.ts), [research service](../../server/services/research.ts), [ingestion](../../server/services/ingestion.ts), [reader](../../src/views/StoryExperience.tsx), [lens rendering](../../src/components/StoryLens.tsx).

## The eight insights

| Insight | Status | What it would take to fulfil the promise |
| --- | --- | --- |
| Projection mapping | Prototype signal slot, evidence pair and safeguards. | An attributed accusation, alleged target, corresponding accuser conduct, any documented denial, a scope/charged-language baseline, evidence about proportionality and serious alternatives. Mirroring can be observed; unconscious disowning remains an interpretation. There is no population-level Shadow detector. |
| Compensation / pendulum | Optional counterpressure reading. | Model the expressed dominant attitude, actual opposing pressures, neglected alternatives and historically comparable paths. There is no longitudinal collective-attitude model or calibrated reversal forecast. |
| Arc position | Partial. | The app has beginning/escalation/crisis/aftermath/unclear and a loose historical sequence. It does not align both arcs at a corresponding decision point or have a reference class for what usually followed. Call/descent/return must remain optional readings rather than mandatory stages for all events. |
| Casting / miscasting | Partial. | Attributed roles and documented power exist. Claimed self-role, roles assigned by others, observed behaviour and the corresponding historical actor are not yet separately and consistently encoded. Power is relational and conditional, not a permanent personality trait. |
| The unspoken | Prototype omission reading. | A defined discourse sample, an expected/relevant question, observed question/response pairs, corpus-wide absence/deflection tests and alternatives. Silence alone cannot establish repression or concealment. |
| Inflation / collapse signals | Prototype grandiosity reading with a second observation requirement. | Attributed rhetoric, material constraints, feedback rejection, scope and historical comparisons. There is no validated inflation index, leading indicator or timing model. Destiny language does not establish that collapse is near. |
| Symbol tracking | Prototype text-attested symbol reading; sourced article imagery is implemented. | Image/caption provenance, visual identification, reuse/deduplication, time-window denominators, cultural context and audience evidence. There is no image-surge or emotional-contagion monitor. Displaying a photograph is different from analysing its circulation. |
| Where the parallel breaks | Strongest implemented contract. | Every retained lens carries a boundary and alternative; a historical lens requires boundary evidence from both episodes. This still needs semantic/expert evaluation. The current system can show an interpretation and its limit; it cannot certify the interpretation through the presence of a caveat. |

## Completed refresh, 3 November

The final refreshed cohort contains 154 stories: 79 with a retained reading, 47 with a paired historical reading, 75 with casting, 8 with role-and-power evidence and 25 with a stage reading. Three counterpressure fields appear; projection, omission, symbol and grandiosity fields remain zero. All 79 readings carry an alternative and boundary. These are feature-presence counts, not measured accuracy or demonstrated detectors.

The live site now contains 164 public situations after automatic reporting resumed. Its active case collection has 252 records (2 marked source-checked, 163 reference-only, 87 automatically researched), rather than a reviewed same-schema canon. The [completed refresh report](public-refresh-results.md) records integrity, software verification, operating capacity and limits.

## What actual data showed at this checkpoint

At **19:52 UTC on 3 November**, the first 30 completed targets in the in-progress refresh contained:

- 15 stories with a retained structured lens; eight with a historical lens.
- 14 with attributed casting, three with retained role-and-power evidence, and four with a retained stage.
- Zero retained projection, omission, symbol, counterpressure or grandiosity signals.
- A competing reading and boundary in all 15 retained lenses, as required by the representation.

The evidence is in [the feature-coverage snapshot](../../audit/narrative-refresh/feature-coverage-checkpoint-30.json). These counts are feature presence in an interim batch, not accuracy measurements, population estimates or final refresh counts.

The active historical collection at the adjacent checkpoint contained 192 records: **2 marked source-checked, 163 reference-only and 27 automatically researched**. Those status labels are not independent historian certification. The collection is not a curated 100–200-case canon with a shared narrative schema, even though its record count is similar.

## What a qualitative reading exposed

An [eight-story convenience sample of actual published readings](../../audit/narrative-refresh/qualitative-spot-check.md) showed further gaps beyond missing features. Some outputs mainly restate the article. Some retain a strong title or role label after the body has been narrowed to acknowledge missing evidence. Some quoted fragments establish only part of the accompanying claim. One historical reading uses the same company’s earlier controversy: useful background, but distinct from recurrence across independent contexts. An alternative sometimes amounts to a contrasting fact rather than a different explanatory account.

At a later 110-story checkpoint, one counterpressure field appeared. Its example (the Burnham/Sunak flight-controversy reading) describes competing fairness and operational-necessity frames; it does not establish a long-building collective imbalance or reversal. The main insight also makes an unsupported frequency claim about which frame wins. This is a concrete example of feature presence failing to establish the intended capability. The stored sample is [signal-examples.json](../../audit/narrative-refresh/signal-examples.json). The bounded recovery pass subsequently removed the unsupported frequency claim and optional counterpressure signal from that story, retaining a modest current-only reading with its historical equivalent unestablished. The earlier snapshot remains available for audit; this correction is not validation of the remaining collection.

These are specific observed failure modes, not an accuracy rate. They show why neither a retained lens count nor a second model check can establish the quality promised by the product. Review needs to cover titles, labels, the full claim-to-passage relationship, candidate selection and the actual insight delivered.

## Ongoing operating capacity

The configured normal background model allowance is 60 calls per UTC day. This investigation pipeline can use a planning call, wider search, assessment, optional assessment repair and optional claim review: up to five calls. Where all stages run, 60 calls permits only about 12–15 such investigations before other work or unit limits are considered. That is arithmetic from the configuration and pipeline, not an observed sustained throughput benchmark. The controlled refresh uses an explicitly bounded separate ledger; it does not raise normal capacity or establish an always-current service.

A broad news front therefore needs coherent event clustering, applicability/evidence checks, prioritisation, change-sensitive reuse, reusable reviewed historical chapters and visibility into backlog, latency and coverage. Routine article publication and deeper investigation are different workloads. The current claim-function definition already prioritises reader jobs, then ordinary system work, then background research, with availability and creation time within those groups. That is a useful implemented safeguard. These jobs still share worker capacity; measured interactive latency, backpressure and capacity planning remain necessary as usage grows. Repeatedly running an expensive full investigation on every headline would consume capacity without ensuring more insight. A source-only story can still be browsable; a finished historical lens must be earned.

The live batch also exposed provider queuing: increasing parallelism caused request timeouts rather than proportionate throughput. Leases and heartbeats kept jobs recoverable, but bounded concurrency and targeted recovery remain operational requirements.

## The architectural change that matters

Use one versioned `NarrativeEpisode` representation for both current and historical episodes. It should distinguish:

- Identified actors, attributed role claims, documented actions, resources, dependencies and decision rights.
- Setting, trigger, central conflict, stakes and available choices.
- Source-grounded beats with dates/order, actor/action/consequence and dependencies.
- Supported turning points, current stage and uncertainty.
- Speaker/publisher framing, reception evidence when available, and Tether's interpretation as separate layers.
- Material conditions and boundaries; historical later outcomes stored separately from stage-specific match evidence.

Current-only planning helps limit anchoring, but the later assessment still sees historical sources and search reports containing later outcomes. Its final stage and role judgments are not fully blinded. Extract and freeze the current episode first, and exclude later outcomes from the historical match features before revealing the next chapter. This reduces a concrete route for hindsight bias; it cannot erase a model’s prior knowledge.

The comparison should return an explicit map: which actors/relationships and beats correspond, what cannot be mapped, what conditions differ, why this case was selected and which alternative would change the interpretation. Labels alone cannot supply this structure.

Structure-mapping research offers a relevant design principle: compare connected relationships rather than isolated attributes. Its computational mapping scores are structural evaluations, not calibrated probabilities of truth or forecasts. [Northwestern research group's account](https://qrg.northwestern.edu/ideas/smeidea.htm).

Embeddings need not be discarded. They can retrieve semantically related candidates; they do more than match vocabulary. The architectural requirement is to avoid treating an embedding distance as proof of narrative structure. Explicit alignment and evidence checks should select the final comparisons. [Reimers and Gurevych, 2019](https://aclanthology.org/D19-1410/).

## Canon and broader history

Start with 20–30 carefully sourced, consistently encoded and independently reviewed cases for a pilot. Write each readable historical chapter once, with source evidence per beat, multiple interpretations, material limits and negative/counterexample cases. Grow toward 100–200 only when this representation and the reading experience work.

The canon should be a quality anchor and reusable editorial asset, **not the boundary of historical discovery**. Otherwise it recreates the user's earlier objection to a small dataset. Keep broader search as a path for missing/weak fits, source new candidates, review them and version additions. Show whether a result came from the canon or wider provisional investigation. A failed canon match does not establish historical uniqueness.

A second distant parallel can strengthen a recurrence hypothesis. Three selected cases do not prove universality, innateness, independence or forecasting value. Different cultures may have influenced one another, and shared institutions/incentives can also produce resemblance. Include counterexamples and investigate contact and material conditions rather than infer independence from geographic distance.

## Form factor under the comparison-led reframe

Keep the visual, browsable front door. Reserve a completed-parallel lens badge for a sufficiently supported paired reading; label current-only work with its historical search still open.

The initial reading should proceed through:

1. A neutral, sourced account of the current episode in a few beats.
2. A specific earlier episode told through corresponding beats. Desktop can align columns; phone can interleave Now/Then per beat so comparison does not rely on memory.
3. A short description of the shared shape, after the reader has seen it.
4. The consequential break and why it changes the implication.
5. The historical next chapter, clearly separated from what remains unknown today.
6. Optional theory/archetype vocabulary, competing readings and source detail with clear labels.

Casting and stage should primarily be legible in the alignment rather than require separate explanatory panels. A competing historical match is different from a competing paragraph about the same chosen case; contested events may need both. Keep selection rationale inspectable because choosing the analogy can itself flatter or condemn an actor.

Publisher attribution is implemented, but sourced headlines are not automatically neutral. Current feeds include opinion and photo essays under the broad reporting kind. Editorial genre needs explicit treatment, and Tether's factual event beats must be distinguishable from a publisher's frame and the app's lens.

## Evaluation and the feedback loop

The reader's ability to state the shared structure without seeing its label is a valuable, falsifiable comprehension test. It does not alone certify historical fit: failure can also reflect poor copy, unfamiliar context or the reader's prior knowledge. Test the comparison without priming, then separately test recognition of the break, false-parallel rejection and later transfer to unfamiliar stories.

Research on analogical encoding supports testing case comparison for learning and transfer, within the bounds of the negotiation studies concerned. It does not establish that Tether already teaches this skill. [Gentner, Loewenstein and Thompson, 2003](https://groups.psych.northwestern.edu/gentner/papers/GentnerLoewensteinThompson03.pdf).

A useful feedback event would attach to exact current-analysis, historical-case and alignment versions: helped/did not help/unsure, optional reasons (too loose, unsupported claim, missing difference, useful perspective), and an optional reader-written pattern. Retain source/structural review independently of popularity. Click-through, divergence expansion, sharing and return visits measure use; they cannot determine historical or psychological truth.

This is the next product architecture to build. The current refresh supplies reusable current evidence and candidate historical mappings, not a substitute for the canon, structural matcher, aligned-story reader or human feedback loop.
