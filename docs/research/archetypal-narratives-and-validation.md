# Tether: recurring collective dramas, historical parallels and validation

Research and proposed product contract · 3 November 2026

**Status:** research synthesis and the initial read-only audit, followed by a first implementation of structured lenses and pre-search narrative planning. The audit below describes the system before that increment. The broader validation programme remains proposed. See [the reader insight contract](reader-insight-contract.md) for all fourteen requested payoffs, implemented scope, form factor and remaining data requirements, and [verification](../design/narrative-lenses-verification.md) for checks actually performed.

## 1. The clarified idea

Tether should help someone recognise the recurring human story taking shape around an event: what people fear or hope for, which roles they assign, which responses the story makes attractive, and how comparable dramas have unfolded before. History supplies concrete episodes that can support, challenge or complicate the proposed pattern. New evidence shows where the present follows or departs from those episodes.

A useful product question is:

> What familiar human drama is organising this event, how are different groups participating in it, and what does history reveal about its possible paths?

The subject includes both recurring dramas enacted through decisions and relationships, and the stories participants or publishers tell about them. Explicit rhetoric is evidence for one layer; an action pattern can be investigated even when nobody names its symbolic meaning. Tether must distinguish its interpretation from a participant’s self-description.

That encompasses collective projection, threatened identity, promised salvation, scapegoating, loss of control, renewal and solidarity. The reader gains historical context, awareness of framing, and a clearer view of their own participation. Predictions are one possible downstream application; insight and agency have value independently.

This is a stronger organising principle than a historical resemblance followed by an optional Jungian paragraph. The earlier implementation made the narrative layer peripheral. The next design of the analysis engine should make narrative hypotheses central to discovery and historical comparison, with evidence able to revise those hypotheses.

## 2. What the research supports—and what remains interpretation

### Jungian inspiration and the group level

In Jung's account, archetypes concern recurrent organising forms, expressed through culturally situated images and stories. They should not be treated as a fixed catalogue of stock characters whose names determine an event's meaning. The inherited origin and universality of specific patterns remain contested. [Jung, original text excerpt](https://web.english.upenn.edu/~cavitch/pdf-library/Jung_MotherArchetype.pdf); [Princeton publisher excerpt](https://pup-assets.imgix.net/onix/images/9781400850969/9780691018331.pdf?fm=pdf).

**Cultural complexes are especially relevant.** Singer's account extends analytical psychology to recurring, emotionally charged group experience and historical memory. This offers a vocabulary for the level the product is trying to investigate. It is an interpretive theory, not an established population-diagnostic instrument. The authors themselves describe their approach as one perspective among several explanations of conflict. [Singer, 2006](https://onlinelibrary.wiley.com/doi/abs/10.1002/ppi.110); [Singer and Kimbles, introduction](https://jungpage.org/learn/articles/culture-and-psyche/629-the-cultural-complex).

There is significant disagreement inside contemporary analytical psychology. Roesler's 2025 critique separates several strands of archetype theory, challenges biological/universalist arguments, and calls for better research; he also discusses investigation of transformation patterns. Goodwyn argues that developments in genetics reopen questions about an inherited substrate. Neither establishes an accurate news-to-archetype detector or a forecasting advantage. Tether should identify these positions as arguments rather than present one as settled consensus. [Roesler, 2025](https://onlinelibrary.wiley.com/doi/full/10.1111/1468-5922.13095); [Goodwyn, 2020, abstract](https://onlinelibrary.wiley.com/doi/abs/10.1111/1468-5922.12642).

**Product inference:** recurring narratives can be investigated without making their biological origin a condition of product usefulness. Tether can make their symbolic interpretation explicit and test the observable claims separately. None of the research reviewed establishes that headlines provide direct access to a collective unconscious.

### Narrative structures can be studied systematically

The Narrative Policy Framework defines researchable components including setting, characters, plot and a proposed solution. Its literature includes methods for analysing actors and narrative elements across a corpus. This is a practical bridge from a compelling interpretive idea to an accountable coding procedure. It is not a validation of Jungian ontology. [Jones and McBeth, 2010](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1541-0072.2010.00364.x); [Jones, McBeth and Shanahan, 2022, open research collection](https://scholarworks.montana.edu/items/46690eef-9947-4595-8e3d-2a7695851754).

Entman's framing account distinguishes a communicator's selection and emphasis from a receiver's response. A frame detected in a text does not establish that an audience accepted it. This is fundamental to claims about collective projection. [Entman, 1993](https://is.muni.cz/el/1423/podzim2018/POL256/um/Entman_1993_FramingTowardclarificationOfAFracturedParadigm.pdf).

**Product inference:** identify who is telling the story, whom it casts into which role, what the story proposes doing, and what evidence exists of uptake. “Speaker X portrays Y as a threat” and “Y is a threat” are different records and different claims.

### Moral panic supplies a demanding test case

Goode and Ben-Yehuda's framework examines concern, hostility, consensus, disproportionality and volatility. High emotion by itself is inadequate. Disproportionality requires an assessment of the underlying threat; agreement must be scoped to the relevant group. [Goode and Ben-Yehuda, 1994](https://www.annualreviews.org/content/journals/10.1146/annurev.so.20.080194.001053); [author paper copy](https://users.ssc.wisc.edu/~peoliver/SOC924/Articles/GoodePanics.pdf).

**Product inference:** concern about a genuine hazard may be warranted. An apocalypse frame does not make climate or health risks imaginary. Until the necessary evidence is available, Tether should describe an observed threat/blame frame and keep “moral panic” as a hypothesis under examination.

### There is empirical research on transmission and reinforcement

Brady and colleagues found that moral-emotional language was associated with wider diffusion in the political Twitter material they studied, especially within ideological networks. Rathje and colleagues found out-group language strongly predicted engagement in their sampled social-media posts. These are bounded findings about particular datasets, not a universal law about media or proof of unconscious projection. [Brady et al., 2017](https://doi.org/10.1073/pnas.1618923114); [Rathje et al., 2021](https://doi.org/10.1073/pnas.2024292118).

A later study combined observational data and controlled experiments on reinforcement and outrage expression. Its authors explicitly distinguish expressed outrage from internally experienced emotion, which they could not directly measure. [Brady et al., 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8363141/).

Shalizi and Thomas show how observational network data can confound influence with similarity between people. Shared exposure to a new event is another possible explanation for simultaneous changes. [Shalizi and Thomas, 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3328971/).

**Product inference:** a repeated theme across articles establishes repetition in that corpus. Demonstrating transmission requires temporal and exposure evidence, while causal influence requires stronger identification. A count of angry headlines cannot establish how humanity feels.

Shiller's narrative-economics programme is also closely related: circulating stories can be investigated as part of economic behaviour and historical change. It provides a productive research direction, rather than a licence to attribute every outcome to a single narrative. [Shiller, 2017](https://www.nber.org/papers/w23075).

Recent work reinforces the need for context: a 2026 field experiment on X found effects of activating an algorithmic feed on some political views and following behaviour, with asymmetries and limits on generalisation. The platform, time window and intervention matter. [Gauthier et al., 2026](https://www.nature.com/articles/s41586-026-10098-2).

### A good historical analogy needs relational structure

Gentner's structure-mapping approach distinguishes connected relationships from shared attributes. It supplies a useful principle for evaluating comparisons: correspondences should form a coherent system of relationships. A familiar dramatic label cannot supply that structure by itself. [Gentner, 1983](https://doi.org/10.1207/s15516709cog0702_3); [Northwestern research group's explanation](https://qrg.northwestern.edu/ideas/smeidea.htm).

**Product inference:** “both have heroes and villains” is too broad to discriminate between episodes. The useful comparison specifies roles, relationships, ordering, available choices, institutional responses and consequential differences.

## 3. Initial implementation audit, before the structured-lens increment

The current system provides useful provenance checks, but it has not established an independently measured accuracy rate for historical or archetypal matching.

- The local fallback explicitly excludes archetypal identities from retrieval: `server/domain/compare.ts`, around line 63.
- The live search instruction explicitly says not to infer a psychological archetype or motive: `server/services/research.ts`, around line 389.
- A later assessment can generate a nullable narrative interpretation. Its schema contains a title, interpretation, alternative and source IDs: `src/lib/comparison.ts`, around line 224.
- There is no structured representation of multiple communities' frames, source-attributed role assignments, narrative stage transitions, measured uptake, or competing pattern mappings.
- The validator checks retrieved sources, quoted support passages, chronology, source-host breadth, and minimum numbers of relationships/differences. These checks establish important provenance properties. They do not independently judge whether a quotation entails a proposed relationship or whether the psychological interpretation is justified.
- Different source domains are not necessarily independent evidence: several pages may reproduce one announcement or cite each other.
- The browse inputs are thirteen BBC/Guardian feeds. That is a limited editorial sample, not a representative view of humanity's narratives.

A read-only check of the public connection endpoint returned **18 connections: all partial, 14 web-researched and 4 reference-only**. Five contained a narrative object; four of those used the generic title “Jung-inspired motif.” The [captured endpoint snapshot](../../audit/research/archetypal-implementation-audit.json) demonstrates the peripheral treatment of the intended core. It is not an estimated error rate, an exhaustive corpus count, or a claim that all eighteen comparisons are wrong.

The existing software tests protect extraction, citation gates, chronology, versioning and other behaviour. Passing them does not establish the accuracy of the interpretive content. The evaluation protocols in the earlier reports are proposals, not completed independent studies.

## 4. The proposed analytical object

The basic object should become an **unfolding narrative episode**, connected to one or more factual event episodes. An episode may contain competing narratives, and an actor may occupy different roles in different accounts or at different times.

Keep five things separately inspectable:

| Layer                             | Example of an appropriate claim                                                                                       | Evidence required                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Event                             | An institution introduced a new capability or restriction.                                                            | Reporting, documents, dated actions.                                                                           |
| Public narrative                  | A named speaker portrays that capability as liberation; another portrays it as a loss of control.                     | Attributed passages, speaker, stance and context.                                                              |
| Collective response               | A defined community increasingly repeats or acts on one interpretation.                                               | A specified corpus/time series, or appropriate audience/behavioural evidence.                                  |
| Archetypal interpretation         | The role/relationship pattern is consistent with a story of dangerous new power or threatened guardianship.           | Explicit mapping, competing readings, cultural context and contrary evidence.                                  |
| Historical/predictive implication | A previous episode offers a useful conditional path; certain observations would make that path more or less relevant. | Stage-specific historical evidence, conditions, differences and prospective validation for forecasting claims. |

A mythic exemplar also needs a distinct type. A story such as the Sorcerer's Apprentice can illuminate a motif; it does not itself count as a documented historical event. Historical evidence that people invoked a myth is a further, verifiable claim.

“Projection” deserves particular care. Evidence of concentrated blame can be observed. A claim that a group is disowning its own traits and projecting them onto another group is a further psychological interpretation. Contradictions between self-description and behaviour may support investigation, but alternatives include strategic rhetoric, sincere disagreement, self-interest and justified criticism. The target's actual conduct must remain independently assessable.

## 5. The revised method

The following is a **proposed research/engineering method**, not a literature-validated Tether algorithm.

1. **Establish the event and the discourse together.** Freeze sources and dates. Extract factual actions separately from attributed descriptions, metaphors, blame, promised remedies and emotional language. Preserve quotation, negation, satire and rejection of a frame.
2. **Construct an early narrative map.** Identify the disruption, valued order, stated stakes, cast roles, audience, proposed response and observed stage. Keep missing elements missing. A narrative may be incomplete, non-moral or contested.
3. **Generate competing pattern hypotheses.** Offer a small set supported by observations, including an ordinary material/institutional explanation. Record which observations discriminate between them. Do not force a pattern onto routine or insufficiently described events.
4. **Use those patterns to direct broad historical search.** Search for comparable sequences and role relationships across domains, eras and regions. Run an additional search through concrete conditions and institutional mechanisms so the first pattern hypothesis cannot silently determine the whole candidate set. These are two views of the same investigation, not two standards of factual truth.
5. **Read historical evidence of both action and interpretation.** Reconstruct what people could know at the comparable stage. Distinguish contemporaneous framing from later historians' explanations. Separate later outcomes from initial conditions.
6. **Map the relationships explicitly.** Show who or what occupies each role in each account, what action follows what perceived threat, how the story is used, and which conditions connect it to behaviour. Identify absent links and role reversals.
7. **Search for disconfirmation and a different ending.** Find a case with similar framing but different material conditions, and where useful a case with similar conditions but a different public response. A counterexample may reveal that the current framing is misleading or that an institutional intervention matters.
8. **Let history revise the proposed pattern.** If the evidence fits another narrative better, change the hypothesis and preserve the previous version. Pattern recognition opens the search; historical evidence can correct pattern recognition.
9. **Publish separated judgements.** Explain factual support, observed framing, interpretive uncertainty, historical correspondence, differences and search coverage. Avoid one similarity percentage that conflates them.
10. **Track change and evaluate it.** New observations may alter a role assignment, audience uptake, narrative stage, material condition or candidate choice. Give observable conditions for competing paths. Evaluate predictions only against timestamped, unknown outcomes and explicit baselines.

The result need not always be one universally best analogue. Depending on the reader's question, the strongest narrative parallel and strongest institutional/mechanistic parallel may differ. Showing that difference can be the insight.

## 6. An initial pattern catalogue

These are **provisional product research profiles**, not a canonical list supplied by Jung and not validated classifiers. Their boundaries must be refined through annotation and counterexamples. Roles belong to a particular framing, not permanently to a person's identity.

| Reader-facing pattern                      | Proposed narrative sequence                                                                                                   | What would support investigating it                                                                                        | Important competing reading                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A search for a rescuer**                 | Disruption → a promised saviour → heightened expectations → tests of dependence or disappointment.                            | Attributed claims that an actor uniquely embodies salvation, plus evidence of mobilisation around that promise.            | Ordinary support for a capable leader or effective intervention.                       |
| **When blame needs a face**                | Diffuse distress → simplified blame → a target → a demand for exclusion or punishment.                                        | Evidence of blame concentration and an alleged cleansing/remedial role for punishment; check responsibility independently. | A proportionate, evidence-based accountability process.                                |
| **Power without control**                  | A valuable capability → rapid uptake → fears of unintended consequences → demands for containment or mastery.                 | Concrete benefits and limits, explicit loss-of-control claims, relevant actions and a visible response.                    | Legitimate risk assessment and successful governance.                                  |
| **The old guard and the new arrival**      | A challenge to an established order → contested legitimacy → gatekeeping or accommodation → new rules.                        | Evidence of challenged authority, competing legitimacy claims and control over entry or recognition.                       | Defensible standards, safety requirements or ordinary competition.                     |
| **The end of the familiar world**          | A threat is framed as total rupture → urgency → exceptional measures or promised renewal.                                     | Explicit catastrophic/irreversible language, affected values and the remedies it supports.                                 | A genuine catastrophic risk requiring proportionate action.                            |
| **The outsiders' sign becomes everyone's** | An in-group practice or symbol → wider adoption → institutional recognition → changed social meaning.                         | Dated adoption and changes in who uses or recognises the sign.                                                             | Ordinary diffusion without a meaningful symbolic boundary.                             |
| **Exposure, reckoning and repair**         | A concealed contradiction is exposed → a legitimacy crisis → demands for accountability → repair, denial or renewed conflict. | Evidence of the contradiction, attributed responses and institutional action.                                              | Unverified allegations, a routine correction or strategic reputational conflict.       |
| **Care creates a new order**               | Shared vulnerability → cooperation → a different relationship or institution.                                                 | Observed mutual aid, negotiated cooperation or repair, with evidence of whom it includes/excludes.                         | Temporary coordination, coercion, publicity or a change explained by incentives alone. |

The catalogue should also accommodate playful inversion, quests, homecoming, renewal and reconciliation. A library dominated by fear and blame would bias both retrieval and the experience of an audience already tired of negative news. Mythic names can be optional cultural references, with the familiar-language pattern and evidence doing the main explanatory work.

A stage diagram must distinguish **observed**, **proposed interpretation**, and **possible future transition**. Merely classifying a pattern must not mark its unobserved later stages as occurring or inevitable.

## 7. A check against a current Tether example

The app's mogging/rizz comparison has a reasonable surface starting point. Collins confirms its 2026 selection of mogging, and Oxford's original 2023 announcement confirms rizz and discusses movement from community usage into wider society. Oxford's account also clarifies the selection process: the public narrowed a shortlist and experts selected the final word. [Collins](https://www.collinsdictionary.com/woty); [Oxford University Press](https://corp.oup.com/news/rizz-crowned-oxford-word-of-the-year-2023/).

The current narrative paragraph interprets the pairing through a trickster/charm motif and an inversion of dominance anxiety. The available source IDs and automatic checks do not establish that underlying anxiety or its psychological transformation. That is an interpretive hypothesis, as the app labels it; it has not earned promotion into the basis of an accurate collective-psychology claim.

A better research comparison would investigate at least two hypotheses: a movement from in-group expression to institutional recognition, and status competition expressed through language. For each, specify the relevant observations, how the social meanings differ, and what additional evidence would be needed. Neither hypothesis becomes true merely because it is more elegantly worded.

This illustrates a key distinction: an event-level analogy can be useful while its appended psychological explanation remains weakly supported. A central narrative model should expose that difference, rather than allow historical plausibility to lend unearned authority to the interpretation.

## 8. The “new tool shatters the status quo” example

This is an **illustrative research design**, not an assessment of a supplied current article and not a completed historical best-match search.

Suppose a new tool promises extraordinary benefits, threatens existing roles, and prompts calls to stop or control it. Plausible readings include dangerous new power, threatened incumbency, concentrated blame for wider changes, and collective learning about a genuine hazard. Tether should seek passages and actions that distinguish these readings.

For a question about expert concern and governance, the 1975 Asilomar recombinant-DNA episode is a useful candidate to investigate. The participants' report discusses conditions for resuming research and managing hazards. That record supplies a valuable alternative to a simple fear → repression narrative. It does not establish that a modern tool presents the same hazards or can be governed through the same institutions. [Original conference statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC432675/); [NLM archival report](https://digirepo.nlm.nih.gov/ext/document/101584644X138/PDF/101584644X138.pdf).

A proper comparison would ask which actors had the power to pause work, how hazards were assessed, whether containment was technically possible, whose interests were represented, and what enforcement or coordination existed. A different question—such as workers' bargaining power—could warrant a different historical episode. The archetypal family guides discovery; the conditions and evidence determine the useful mapping.

## 9. How we could know the method is working

Accuracy is a set of questions, not one number.

| Question                                              | Appropriate evaluation                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are the facts, dates and passages correct?            | Independent source audit; include corrections, contradictions and source dependencies.                                                                     |
| Is the frame actually expressed, and by whom?         | Blind annotation of source spans, speakers, stances, roles and remedies; evaluate quoting, rejection and satire.                                           |
| Is the proposed pattern supported?                    | A versioned codebook, competing labels, missing/contrary evidence, multiple qualified annotators and recorded disagreement.                                |
| Is the historical candidate useful for this question? | Blind, stage-specific comparison against alternatives, same-pattern hard negatives and counterexamples.                                                    |
| Does narrative-guided retrieval add value?            | Matched-budget comparison of current mechanism-first retrieval, narrative-guided retrieval and a combined method.                                          |
| Is a collective trend actually present?               | A declared corpus, time window, denominator, deduplication, source/language composition and uncertainty; distinguish publication from audience acceptance. |
| Does the explanation help ordinary readers?           | Test identification of the event, frame, historical link, difference and uncertainty; check whether it creates false certainty or moral stereotyping.      |
| Does it improve prediction?                           | Prospective, timestamped questions with fixed resolution rules; compare against relevant base rates and no-archetype/no-analogy baselines.                 |

Reliability between annotators and validity of an interpretation are distinct. Krippendorff's work is relevant to designing and reporting coding reliability; high agreement alone cannot remove a shared bias. [Krippendorff, 2004](https://academic.oup.com/hcr/article-abstract/30/3/411/4331534).

### Proposed first evaluation

Build a pilot benchmark around **roughly 60 bounded episodes**, selected across several pattern families, domains, regions and unconvincing/no-pattern controls. That number is a practical first pilot size, not a power calculation or a sufficient basis for universal accuracy claims. Each should have a small, auditable packet of current and historical evidence, alternative narratives and negative candidates.

Have a historian/domain researcher, a narrative/media researcher and a Jung-informed reviewer code cases independently before adjudication. Some episodes will legitimately receive more than one reading. Preserve the disagreement and its reason. If cultural or language expertise is needed, add it instead of assuming the three roles cover every case.

Evaluate source entailment, role/stance extraction, stage alignment, candidate usefulness, consequential differences, unsupported psychological assertions and appropriate uncertainty. Report uncertainty and performance by pattern/domain rather than a single flattering average. Hold related event families and repeated reports together when separating development and evaluation material.

Use historical replay for debugging, with explicit hindsight/contamination limits. Even if a prompt conceals the ending, a pretrained model may already know it. Forecast value requires a later prospective study; an attractive historical explanation is not retrospective proof of foresight.

A second model may critique claims or find contrary sources. Model agreement is a checking aid, not an independent truth standard. More sources, models, labels or confident prose do not replace evaluation.

### Measuring collective processes responsibly

A trend statement should specify something like “in the sampled reporting from these outlets, during this interval,” with the actual sample definition. Counts must be deduplicated so syndicated stories or repeated quotations do not become apparent independent consensus. Track composition changes before interpreting a rise in a frame.

Population beliefs need suitable audience evidence. Transmission claims need temporal adoption and exposure evidence; persuasion claims need a stronger causal design. When those data are unavailable, publish the observed framing and its limits. The current two-publisher feed cannot support a dashboard claiming to measure humanity's unconscious state.

The app should also examine the frame its own analogy encourages. Showing a villain/scapegoat interpretation can itself steer blame. Competing interpretations and differences should help the reader recognise that influence, including when the evidence strongly favours one account. Competing frames do not imply equal factual merit.

## 10. Concrete architecture and product changes implied

The following is the broader target architecture. Structured current-only planning, bounded combined search, explicit present/past lens evidence, roles/power, stages, rivals and boundaries now have a first implementation. Curated pattern validation, expanded historical coverage and independent evaluation remain outstanding. The [reader contract](reader-insight-contract.md) distinguishes those statuses:

1. Add source-attributed narrative observations and multiple pattern hypotheses before historical candidate selection.
2. Create a versioned pattern catalogue with inclusion criteria, competing readings, cultural scope and reviewed positive/negative cases. Replace permanent persona assignments with roles attributed within a specific narrative.
3. Retrieve through narrative sequences and through material conditions; merge and compare candidates without converting a tag match into a confidence percentage.
4. Enrich historical episodes with contemporary accounts, public responses and institutional conditions. Keep mythic exemplars separately typed.
5. Store explicit present/past mappings, contrary evidence and separate judgements of narrative and mechanistic correspondence.
6. Link factual episodes into evolving narrative threads without merging distinct events merely because they share a motif.
7. Preserve immutable analyses and the existing source/security/chronology gates. Introduce the new representation alongside legacy interpretations; do not retroactively relabel them as reviewed pattern analyses.
8. Run the benchmark before broad automatic publication of collective-psychology claims. Keep coverage and capacity failures distinct from a conclusion that no pattern exists.

No database, vector technology or model choice can settle the interpretive validity question. Those implementation choices should follow a defined representation, measured retrieval needs and benchmark results.

The visual direction can continue. The central reading object should visibly include **the human story taking shape**, **the evidence for that reading**, **a historical episode that tests it**, and **what would change the reading**. Patterns can become browseable threads across politics, culture, technology and ordinary life. Their labels should invite curiosity while the first view still includes a material difference and honest uncertainty.

The deeper product promise is to help readers recognise a recurring script while there is still room to respond differently. Establishing that promise requires a central narrative model, a broader historical record that includes framing, and independent evaluation. The existing comparison engine supplies useful infrastructure for that work, but does not yet establish the promised accuracy.
