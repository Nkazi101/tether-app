# Tether: from research desk to visual discovery

Decision record · 3 November 2026 · supersedes the form-factor direction in `redesign-direction.md`.

**Narrative direction update:** the [reader insight contract](../research/reader-insight-contract.md) revises the primary unit from a historical connection with an optional human-pattern paragraph to a clear archetypal reading tested against history. The photographic, browse-first form and progressive disclosure remain. Structured lenses are an initial implementation, not a validated psychological detector.

## The product moment

The intended reader is an ordinary curious person, including someone who normally avoids news. They are browsing for an interesting perspective, not arriving with a research assignment. The first useful experience is: **I recognise this story; I didn’t know that happened before; now I understand one relationship—and one reason the ending could differ.**

Tether should earn curiosity before requesting effort. Its unit is a short, sourced connection between two events. The feed supplies discovery; the reader supplies a clear comparison; following supplies continuity. A source audit, a forecast and a Jung-inspired interpretation are valuable optional depths, not the entry experience.

The prior interface reversed that order. On the actual comparison supplied by the user, the visible main content had 843 words, six secondary headings and zero images. The opening emphasised an incomplete investigation, followed by repeated article/context text, research operations, and advanced tools. The language and hierarchy served the system instead of the reader. A different font alone would not fix that.

## Evidence and the decisions it supports

| Primary source | What it establishes | Product decision and limits |
| --- | --- | --- |
| [Reuters Institute, Digital News Report 2026 executive summary](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary) | News avoidance is widespread (42% sometimes/often); social/video networks have become a common discovery channel. | Begin with an inviting, self-contained visual story and breadth of interests. This does not establish that endless video or engagement maximisation is appropriate. |
| [Reuters Institute, 2025 executive summary](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/dnr-executive-summary) | Respondents still commonly prefer text (55%), valuing control and efficiency. | Keep the experience readable, skimmable and user-paced. No forced video, autoplay or mandatory slide sequence. |
| [Reuters Institute, qualitative research on avoidance](https://reutersinstitute.politics.ox.ac.uk/news/people-are-turning-away-news-heres-why-it-may-be-happening) | Interviews identify relevance, difficult navigation and emotional burden among barriers. | Offer culture, sport, money, technology and everyday life alongside politics; show the useful perspective quickly. Avoiders are not one homogeneous audience. |
| [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Primary tasks benefit from separating advanced detail; controls need clear information scent. | Three explicitly named reading destinations. Keep the main difference visible; put provenance, search traces and versions in Sources & limits. No chain of nested disclosures. |
| [NN/g, Photos as Web Content](https://www.nngroup.com/articles/photos-as-web-content/) | Informative, relevant photographs attract attention; generic decorative imagery often does not. | Use the actual publisher image and credit. If none is available, use an honest typographic fallback rather than an unrelated portrait or an invented historical scene. |
| [Loewenstein, The Psychology of Curiosity, 1994](https://www.cmu.edu/dietrich/sds/docs/loewenstein/PsychofCuriosity.pdf) | A theoretical account connects curiosity to a perceived gap in knowledge. | Show a recognisable present and a specific earlier event together. The connection should invite a question without withholding essential facts. This is a design inference, not a measured Tether outcome. |
| [Segel & Heer, Narrative Visualization, 2010](https://pubmed.ncbi.nlm.nih.gov/20975152/) | Describes how authored narrative and reader exploration can be balanced. | Provide an authored short entry with optional evidence, timeline and human-pattern detail. It is a design framework, not proof of a particular conversion effect. |
| [Gleicher et al., Visual Comparison, 2011](https://graphics.cs.wisc.edu/Papers/2011/GAWJHR11/) | Classifies comparison strategies, including juxtaposition and explicit encoding. | Keep now and then adjacent, consistently labelled, with directly paired evidence available. Do not require remembering paragraphs from distant sections. |
| [The Pudding, About](https://pudding.cool/about/) | A working example of visual essays driven by cultural curiosity. | Treat familiar cultural questions as legitimate entry points. This is a product reference, not controlled evidence of effectiveness. |
| [Axios, Smart Brevity style](https://help.axios.com/hc/en-us/articles/36222626161435-What-is-the-Axios-Smart-Brevity-style) | A practical editorial approach to concise news and explanation. | One takeaway at a time; distinguish the event, the insight and the difference. Brevity must preserve material caveats. |
| [W3C, carousel accessibility](https://www.w3.org/WAI/tutorials/carousels/) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | User control, keyboard access, readable reflow and adequate targets are accessibility requirements. | No autoplay; keyboard-operated tabs; native disclosures; stable image boxes; reduced motion; test at 320px and 390px. |

These findings support the direction. They do **not** prove that this implementation will make news avoiders enjoy news, improve prediction, or increase historical understanding. Those require reader research and outcome measurement.

## The chosen form factor

### Discover

A compact introduction explains the benefit in ordinary language. A horizontal interest selector lets readers choose their own entry point. The featured story visually couples a publisher photograph with a distinct historical panel. Below, image-first cards contain an actual headline, a named and dated possible precedent, and a short takeaway. Unreviewed leads are explicitly labelled and do not receive a completed-insight teaser. Reporting without a completed historical connection remains browseable, but does not masquerade as a completed insight.

The initial feature selection favours approachable topics and diversifies the remaining connections by category. The default hero avoids headlines centred on criminal allegations or casualties where other researched connections are available, and favours a precedent at least three years earlier. This is presentation choice, not a match-quality score; those stories and nearer precedents remain available. This is an explicit editorial default, not a personalised recommender or a validated relevance score. Saved preferences can prioritise a reader's topics. The interface must not call an unpersonalised stream “For you”; its all-topics filter is “Discover”. Recent article dates remain visible, and historical walkthroughs remain labelled as known-outcome examples.

The feature has one clear action: **See the connection.** Bringing a link is available in the navigation and a short expandable form; it is not a task imposed before browsing. There are no invented reader counts, popularity signals, similarity percentages, or guarantees about a globally closest parallel.

### The reader

1. **The connection:** the reported event; adjacent now/then visual; a short relationship and takeaway; the first material difference. Optional direct disclosures expose paired evidence, the historical sequence and the interpretive human pattern.
2. **What to watch:** opposing conditions for a developing event. No indicators are presented as foresight when timing is retrospective or unclear. Observation and forecast tools live here, after the reader has context.
3. **Sources & limits:** original sources, outstanding unknowns, the research trace and actual coverage limits, other candidates, previous versions, and refinement. Failed/limited research remains explicit and inspectable.

A no-result story gets the same considered presentation. Its article can still be understood, while the historical panel plainly says the connection remains open. A failed search is never reframed as evidence of uniqueness. The underlying quota or retrieval failure is accessible in the investigation, rather than becoming the product's opening message.

### Visual language

Readable sans-serif type, a warm neutral canvas, cobalt for connections, and a restrained warm tone for differences. Photography supplies context; coloured historical panels establish the comparative structure without inventing documentary imagery. Small radii and consistent spacing support a tactile, approachable reading experience. The layout avoids academic decoration, administrative metrics and urgency cues. Future research output also receives an editorial brief: complete sentences, concrete actors, explained terms, a short summary and a consequential difference. This instruction was added without commissioning new model output during the redesign; current stored assessments retain their original evidence and wording.

A private Stitch exploration helped compare compositions. Its generated sample claims, source labels, community counts and fictional examples were **not** imported as product data. The implementation uses actual stored stories. A component-library migration was unnecessary: native semantic HTML, existing React components and scoped CSS provide the required behaviour without extra dependency or migration cost.

## Images and operations

- New feed ingestion preserves publisher media metadata; article extraction preserves permitted Open Graph/Twitter image URLs.
- Existing immutable assessments acquire cosmetic imagery from a bounded, reconstructible RSS/metadata cache. They are not rewritten merely to add a photograph.
- One shared feed request supplies card imagery. Detail pages resolve missing metadata on demand. Concurrent requests are deduplicated; caches, response sizes and retrieval durations are bounded.
- Only a fixed set of HTTPS image CDNs can be embedded. Arbitrary metadata cannot direct a reader to local/private hosts. Article retrieval keeps the existing validated-DNS/SSRF protection.
- Publisher and available photographer credits remain visible. Images are labelled as article images, not historical evidence. No fabricated archive photographs or AI-generated documentary scenes are used.
- Images are loaded directly from publisher/CDN URLs, without copying their files into a public media library. Publisher-supplied metadata is provenance, not a blanket licence: production distribution needs a source-by-source rights policy. Stock imagery, if introduced, must be explicitly labelled and recorded in the imagery ledger with its licence; [Unsplash's licence](https://unsplash.com/license) was checked during this review, but unrelated stock was rejected for the active cards.
- Image failure never blocks the story. A stable typographic fallback preserves layout. Evidence, authentication, private ownership and durable jobs do not depend on the cosmetic cache. The obsolete reader implementation was removed so two divergent reader flows cannot accumulate fixes independently. Saved and Following reuse the same visual cards and preserve their existing version semantics. Cancelling sign-in returns to the exact story/tab when the action originated there.

## Validation and next reader research

Technical checks establish implementation behaviour; they cannot substitute for comprehension research. Actual browser results are recorded separately in `visual-discovery-verification.md`.

Recruit ordinary readers, including at least five who report avoiding news, for a first formative round. Give each a neutral task without explaining the navigation:

- After a five-second view of Discover, explain what Tether offers and choose a story.
- After reading its initial connection, identify what happened, what the earlier case adds, and one important difference.
- Find the source for a factual claim and explain whether the comparison was independently reviewed.
- On an incomplete case, explain whether the absence of a parallel establishes uniqueness.
- Find something outside politics, follow it, and return to the changing assessment.

Record completion, wrong turns, time to first useful connection, misunderstood certainty and a simple interest/effort rating. Preliminary acceptance targets: 4/5 readers can describe the benefit, locate a source unaided and articulate a difference; no reader should interpret an incomplete search as exhaustive. Small formative samples diagnose issues and do not provide population estimates.

For subsequent measurement, use source-opening, meaningful return visits and comprehension checks alongside engagement. Do not optimise for dwell time or scroll depth alone. Compare the old and new experiences on the same real stories, include negative and no-match cases, and report failures as well as gains.
