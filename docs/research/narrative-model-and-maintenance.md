# A visible model and demand-driven historical memory

November 4, 2026. This supersedes earlier suggestions to require human review or to hide every theoretical term. It does not claim that the full proposed retrieval/evaluation programme is finished.

## What the sources support

Tether’s cast is a product vocabulary, not a list of fixed personality types established by Jung. The Trickster and Wise Elder have direct lineage in Jung’s discussions of archetypal imagery; the Apprentice, Scapegoat and Tyrant are wider narrative adaptations. The Hero bridges traditions. Projection, inflation and compensation are Jungian concepts applied here as interpretive questions about public evidence. See the [IAAP’s Collected Works abstracts](https://iaap.org/resources/academic-resources/collected-works-abstracts/volume-9-1-archetypes-collective-unconscious/). None of that lineage validates a diagnosis of a group’s unconscious.

The Call, Descent, Crisis and Return are Campbell-inspired shorthand, supplemented by Aftermath and Stage unclear. Campbell’s core movement is separation, initiation and return, rather than a universal news-event classifier. Tether must allow skipped stages and abstention. See the [Joseph Campbell Foundation](https://www.jcf.org/learn/joseph-campbell-heros-journey).

The cited [ACL 2025 study](https://aclanthology.org/2025.acl-long.200/) is real. It reports 20 collected popular analogies with reference answers and a separate 160-event general set without standard answers, drawn from a 658-event pool. It distinguishes retrieval from model generation and checks generated event existence through Wikipedia. Familiar reference analogies can test recovery, but familiarity, contested interpretations, potential training exposure and retrospective outcomes limit what that proves. Its model-based metric is not a universal historical-accuracy score. We have not imported its corpus or run an encoded Tether benchmark on it; repository availability alone does not settle downstream rights to source descriptions.

[Uther’s ATU introduction](https://www.folklorefellows.fi/ffc-284-286-2024-edition/) and the [linked-data research on ATU and Thompson motifs](https://www.dfki.de/fileadmin/user_upload/import/9028_Dh2017_LOD_TMI-ATU_final.pdf) concern folk narratives and motifs. They can inform stable identifiers and cross-references. They are not a ready-made causal ontology of historical events or evidence of independently arising patterns. No tale index text was ingested or treated as historical ground truth.

There is no established evidence here for a sufficient canon size of 100, 150 or 300, a universal five-year settlement rule, a cost estimate for an arbitrary event, or an exhaustive live search. A wide search can measure its observed improvement over a smaller search; it cannot directly reveal a global miss rate. These remain explicit limits rather than product promises.

## Implemented model and reader experience

`src/lib/narrative-model.ts` supplies one versioned definition registry: six figures, three dynamics and six stage states. `/patterns` explains origins and limits. Terms work on hover, keyboard focus and touch; Escape dismisses definitions. The implementation follows the [W3C hover/focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html), with hoverable persistent content and bounded mobile positioning.

An optional `symbolic` layer extends the shared episode schema without changing old serialized episodes or hashes. A role identifies an actual episode actor, says whether the role is claimed or interpreted, cites exact source anchors, and supplies an alternative. Dynamics require anchored observations and alternatives. Stages identify actual beats. Unresolved references and explicit hidden-motive/destiny assertions fail validation. Source-only current and historical reviews must remove unsupported annotations; an exact quotation alone is not semantic validation.

The default pair still shows the two sourced stories before the interpretation. Only compatible roles on mapped actors, or dynamics supported in both episodes, can appear as a shared symbolic reading. At most two are displayed, with evidence and an alternative in a disclosure. A narrow legacy adapter can call matched, reported deception a Trickster reading; it adds no factual confidence. It cannot infer Tyrant from control or Scapegoat from criticism. Existing snapshots are not silently re-encoded or assigned every label. Most seed cases still lack checked symbolic annotations.

## Retrieval remains replaceable

The actual application does not depend on text embeddings. `episode-research-8` uses a cheap source-encoded recall pool: up to 40 predicate/resource leads, 15 symbolic leads, 15 stage leads and 20 curated leads, deduplicated to at most 80. Names and headlines do not affect that recall score. Missing tags do not exclude structural leads. This is a bounded engineering strategy; it can miss cases in a large library.

The directed beat comparator reranks the pool with the existing chronology, connected-action, actor and resource checks. Tags do not relax publication gates or count as factual confidence. Wider web discovery and trace-backed source reading remain available for low coverage and deeper requests. AI can propose leads and encode retrieved material; its recollection cannot serve as the source record. Source-qualified successful public comparisons can add reusable case versions automatically.

A diversity audit looks for structurally eligible cases with different era and geographic metadata. Missing metadata counts as unknown, not diversity. Geographic separation is not cultural independence. This pass does **not** deliver three separately claim-checked, reader-facing comparisons or guarantee a distant case for every event. That remains a real gap; a weak extra case must not be forced into a set to satisfy a quota.

The method page exposes an era × region coverage grid over the qualified encoded archive, filterable by domain and symbolic dynamic. Empty cells remain visible. An unannotated case is not counted as evidence that no dynamic exists. The seed corpus count and the accumulated encoded archive are distinct.

## Four operating clocks, without required human review

| Work | Actual implemented cadence | What the result means |
|---|---|---|
| Current reporting | Feed polling every two hours | Reporting availability; not continuous monitoring of every event. |
| Demand-driven expansion | Up to five gap clusters per UTC week, scheduled during polling | Wider research requests, not five guaranteed new cases. Existing source, claim and daily capacity gates still apply. |
| Source issue feedback | Checked during polling; at most two canon checks scheduled per day | A private source-issue downvote can request verification of its public case. No note or reader identity becomes public. A vote alone does not delete history. |
| Re-verification | Cases become due after 90 days since source capture; staggered under the same daily bound | Fresh retrieval, source-only encoding and a separate automated source check. This is not a guaranteed whole-corpus quarterly sweep or independent historian review. |

The scheduler is intended to run as one active instance. Weekly and daily scheduling bounds assume that deployment contract; the shared model caps and leased publication remain database-enforced across workers.

`tether_research_gaps` stores public, system-owned, eligible investigations only. Its relationship sketch removes article vocabulary and names but preserves directed endpoints, resources and order. Capacity waits and inapplicable headlines are excluded. Network/source failures stay distinct from no structural match. Clusters guide weekly broader requests; a later successful pair marks the situation’s gaps filled. Three existing gaps were indexed and three expansion requests queued in the initial run. No new historical acceptance is implied by that queue receipt.

Source checks use a fresh source-only draft and a separate verification pass. They require two accessible independent source origins and an original/scholarly foundation. An inaccessible page or disagreement parks the attempt rather than declaring the old case false. Changed bounded dates or actor identities cannot silently replace another event under the same case ID. This is not two blind encodings with measured inter-model agreement, and it must not be described that way.

Passing checks append a new version through a lease-guarded database transaction. They do not edit old snapshots. Public heads using that case are then queued idempotently for reassessment; a retry after publication resumes propagation rather than paying for another encoding. Normal daily limits remain 60 background calls, 120 global calls and 6,000,000 reserved units. Exhausted jobs defer; old pilot ledgers stay closed. Private investigations never feed the public expansion log or shared case memory.

## Measured result and remaining gaps

The actual new leave-one-out probe removed each of 14 seed cases from its own candidate pool. **Zero of 14 queries found another case passing the current structural threshold.** Fixed-order subsets of 4, 8 and 14 also produced no cross-case structural candidate. This demonstrates no cross-case redundancy in this seed set under the current encoding/matcher. It is not a factual accuracy estimate, proof that history lacks parallels, or evidence of saturation. More coverage and diagnosis of representation/retrieval failures are needed. Receipt: `audit/narrative-model/canon-evaluation.json`.

The existing 70 synthetic invariants and the new software tests remain separate from known-analogy recovery, independent accuracy or reader usefulness. The ACL set still needs source-grounded, as-of-date-aware encodings and clear evaluation rights. A representative held-out benchmark, observed wide-search improvement study, culturally distant triangulation, calibrated symbolic interpretation and predictive advantage remain unfinished. Human reviewers are not a prerequisite for running the product; without independent assessment, its limits must remain visible.

Linked migration and rollback tests verify service-only access, RLS, ownership, stale lease refusal and atomic canon publication. Advisor output includes 14 pre-existing warnings in profiles, curations, GDELT policies and managed Auth settings; no new maintenance relation was flagged. The existing unused quota variable remains a SQL lint warning. This change does not claim that all legacy security/performance advisories or disaster recovery work are resolved.

The local development server now shares its HTTP listener with Vite HMR, closes both on shutdown, and ignores audit/build/backend-only writes for page reloads. This addresses the observed reload and websocket failures, using the installed [Vite 6 server configuration](https://v6.vite.dev/config/server-options#server-hmr). No UI library migration was needed.
