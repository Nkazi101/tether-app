# Comparison reader and publication standard

Implementation phase: November 2026. This document distinguishes research findings, product choices and unvalidated assumptions.

## What the research supports

| Evidence | Design decision | Limit |
| --- | --- | --- |
| [Gentner, Loewenstein & Thompson (2003)](https://groups.psych.northwestern.edu/gentner/papers/GentnerLoewensteinThompson03.pdf): comparing cases helped novices abstract and transfer negotiation structures. | Show the two stories before the reading. | Negotiation experiments do not validate this news product or Jungian universality. |
| [Northwestern's structure-mapping research](https://www.qrg.northwestern.edu/ideas/smeidea.htm) distinguishes relational mappings from appearance similarity. | Match directed actions, consistent actor mappings and connected sequences; names and titles do not affect ranking. | Our bounded matcher is an engineering implementation inspired by this work, not SME or an empirically validated cognitive model. |
| [Gentner & Markman (1997)](https://groups.psych.northwestern.edu/gentner/papers/GentnerMarkman97.pdf) examines differences connected to a shared structure. | A difference needs facts from both cases and a consequence for the proposed mechanism. | “Different technology” alone is insufficient. |
| [Fischhoff (1975), authorised journal reprint](https://qualitysafety.bmj.com/content/12/4/304) studies how outcome knowledge affects judgments. | Freeze current extraction before history; keep the later historical chapter separate. | A model can still bring prior knowledge or bias. This is a mitigation, not proof of blind analysis. |
| [Reuters Institute Digital News Report 2026](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary) documents avoidance, overload, trust concerns and openness to new formats. | Offer topic breadth, dated source imagery and short optional comparisons rather than a required theory lesson. | Survey findings do not establish that this layout improves engagement or reaches news avoiders. |
| [Nielsen Norman Group: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) recommends prioritising essential tasks and deferring advanced detail. | Keep alignment and the important difference visible; put theory, casting, detailed methods and alternative interpretations in clearly named disclosures. | This arrangement still needs observed usability testing. |
| [AP's generative AI standards](https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/) treats generated material as unvetted and rejects false depictions of reality. | Explicit automated-research labels; source imagery; no synthetic historical photographs. | Tether uses generated interpretations and therefore does not claim to follow AP's prohibition on publishing AI-written reporting. |
| [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). | Interleave Now/Then on narrow screens, check 320px reflow, provide visible focus and adequately sized controls. | Sampled browser checks are not a complete accessibility audit. |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [upsert](https://supabase.com/docs/reference/javascript/upsert). | Feedback goes through API identity/access checks; direct client grants are revoked and RLS enabled. Exact versions are server-derived. | A service key bypasses RLS and must remain server-only. |

## Reading path

Browse dated, attributed stories across categories. A new comparison badge is earned only by a validated `pairedStory`; earlier prose analyses remain accessible in version history. The default mix starts with the most recent public story in each available category from the last seven days, then continues with chronological pagination. IDs are deduplicated; the mix does not change the chronological cursor or skip its unseen items. Topic pages remain chronological. This is an editorial choice for breadth, not a validated engagement or neutrality claim. Explanatory marketing copy follows the feed.

The feed does not reveal the interpretation before the reader sees the evidence. All public reporting without a new aligned pair opens in the simpler source-first reader. Where a previous-method lens exists it is available in an explicitly labelled disclosure; older payloads are not overwritten. Explicit opinion/review/live URL conventions are labelled; unknown genre is not silently called neutral reporting.

Inside an aligned story:

1. The reported headline, source and image; the bounded historical episode.
2. Ordered Now/Then moments, with exact source passages available beside each one.
3. A short possible shared reading.
4. A consequential difference, with present and past evidence visible.
5. A documented later historical chapter, if one exists after the matched stage.
6. Optional alternative reading, actor correspondences, selection limits and private usefulness feedback.

On a phone each Now moment is immediately followed by its Then counterpart. A reader does not have to remember a separate timeline or complete a quiz. An inapplicable or unfinished comparison gets an attributed source-first reading; absence of a pair is never described as historical novelty.

## What “no AI slop” means operationally

This is a publication standard with reject paths, not a claim that a model or a phrase filter guarantees quality.

- Specific actor, action and constraint. Short observations; one consequential action per beat. No stock wisdom, decorative archetype labels, abstract “custodians”, or “history repeats” copy.
- The same versioned episode representation for present and past. Accusations and denials remain attributed framing; they do not become established actions.
- Exact, scoped source anchors; unique IDs; real actors/aliases; valid dates; connected relationships. Illustrations cannot support factual claims.
- Historical anchors from two independent source origins. Known mirrors/copied accounts are rejected heuristically; editorial independence remains a judgment.
- Three distinct connected kinds of action across at least two ordered groups, two consistent actors and compatible resource kinds. Each group may join up to two adjacent moments; known chronology in either account cannot be reversed. Unmatched current developments remain available explicitly outside the alignment. These thresholds are engineering choices to evaluate, not an accuracy percentage. There is no whole-story coverage cutoff: a bounded partial comparison must not be made to look comprehensive.
- Candidate search is bounded (beam 48; 24,000 explored states per case). Missing matches can be representation, retrieval or search failures. Never advertise an exhaustive or globally optimal match.
- Source membership comes from anchors. One invalid historical candidate cannot erase other valid candidates in that extraction.
- Current extraction is source-checked and frozen before history. Historical encodings receive a separate source-only semantic check before ranking; the final reading then receives a full-pair claim check. Each can withhold the reading. Original records, original reporting or analysis, or scholarly history must support the matched actions; two retrospective guides on different domains are insufficient. Source-origin triage needs an identifying exact passage, or a recorded agent source audit. This is not independent historian review.
- Separate automated claim review can withhold a structurally eligible pair. Exact quotations prove text occurrence, not entailment, independence or historical truth.
- No unconscious-motive diagnosis, collective-belief assertion, deterministic ending, frequency claim or probability based on one analogy. Source-attributed rhetoric may still be documented as rhetoric.
- An actual competing explanation and a concrete break are required. Unmatched future historical beats may appear only as a separate continuation.
- Real source/archive imagery, labelled by provenance. Missing imagery stays a restrained typographic panel, not an invented documentary image.
- No empty feature panels, AI sparkle decoration, made-up certainty scores, or public popularity counts masquerading as accuracy.

## Feedback and evaluation

Feedback attaches to analysis ID, historical case/version, alignment method and pair fingerprint. The server supplies these identifiers. A session can read, revise or delete only its own response to a readable comparison. Raw notes are not public. Guests can respond without an account; signing in creates an account-scoped response rather than exposing another identity's notes. Rate limits apply by session/account and hashed IP.

`explanationSeen` records a client-reported intersection of the reading with the viewport. It is not proof of reading, a blind test or a fluency score. The reader sees Upvote/Downvote, with optional reasons and notes. The older unsure value remains readable for compatibility. This is a product signal, not factual adjudication.

Before claiming accuracy or historical breadth, create a held-out, independently annotated set containing strong structural pairs, vocabulary decoys, reversed actions, disputed actors, weak sources, hindsight traps and true abstentions. Measure candidate recall separately from precision of published pairs. Compare independent raters' correspondence and difference judgments. Test whether ordinary readers can state the shared structure in their own words **before seeing the explanation** in a dedicated research condition. The ordinary product deliberately does not force that research task onto everyone.

The automatically encoded accumulated library is not the proposed historian-reviewed canon. A deliberately distant second case, validated projection/compensation indicators, representative independent benchmarks, and reader pattern-fluency claims remain separate work. Three cases alone cannot establish cultural independence or a universal archetype.

## Live pilot lessons

The live pilot exposed inconsistent beat granularity, a bad actor/action encoding, awkward generated prose, an unsupported optional future inference, and historical pages that were retrospective commercial guides. These are distinct failures. Adjacent ordered windows address representation granularity without reversing chronology. Typed predicate constraints and a historical source-only review address semantic encoding. A versioned plain-language standard rejects decorative prose without retroactively invalidating old snapshots. Unsupported optional implications can be removed while sourced history remains. Source-origin provenance gates new comparisons; the audited pilot replaces guides with original reporting, contemporaneous analysis and an attributed agency statement. Some original pages were accessible to the research browser but not the programmatic reader: their agent-authored summaries and short exact quotation registries are explicitly labelled, not presented as fully fetched publisher text. A later algorithm review also found that requiring connectivity of every partial prefix could discard a valid case whose strands connect later. Partial strands now survive the bounded search; completed mappings still require connectivity. The regression failed before the correction and passes after it. No single fix establishes accuracy. Pilot receipts and the lifetime call/reservation ledger are in `audit/episode-pilot`; the completed v5 refresh ledger was not reused.


## Operational cost and remaining coverage work

A full, eligible, uncached investigation of pages whose origins are not yet qualified now takes eight model calls before repairs: current encoding, current source check, live discovery, source-origin triage, historical encoding, historical source-only check, reading, final claim check. Sixty background calls allow roughly seven such investigations per day, less when repairs are needed; ineligible stories and compatible checked episode reuse cost less. The existing feed can be broad while comparison coverage is sparse. Raising spend or filling the feed with weak parallels would not resolve that quality bottleneck.

The next corpus work is a source-qualified, independently reviewed canon across periods, regions and domains, plus better accessible archival acquisition and held-out retrieval evaluation. The bounded research browser audit is useful curation, not evidence that ordinary ingestion automatically acquires those same original sources.

## November 4 coverage implementation

The [coverage expansion report](coverage-expansion-results.md) supersedes the earlier operational coverage snapshot: the active route is `episode-research-7`, with 14 source-audited seed cases, library-first ranking, wider retrieval, safe HTML/PDF acquisition and checkpointed capacity waits. Eligible local matching takes four cold calls or two with a verified frozen current graph; full cold web discovery can still take eight before repairs. A withheld local reading triggers at most one wider attempt. The 70 synthetic checks are corpus-derived regressions, not independent historical validation. Reader upvotes/downvotes are the chosen usefulness loop; no reviewer recruitment or mandatory study is part of this implementation.
