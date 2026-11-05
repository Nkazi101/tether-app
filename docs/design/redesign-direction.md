# Tether: an editorial research desk

> Earlier iteration. The current form factor and its evidence are documented in [visual discovery research](visual-discovery-research.md) and [verification](visual-discovery-verification.md).

## Product understanding

Tether connects current reporting to historical cases. Its matching model considers mechanisms, actor roles, narrative phases and archetypes. Readers can discover a connection in the feed, investigate a headline in Explore, compare evidence in a deep dive, browse editorial collections and save comparisons to a personal library. The archive also contains unreviewed discovery episodes; these must remain distinguishable from curated cases. Accounts support saved comparisons and reading preferences. Administration includes ingestion and archive tools.

The most important product promise is a useful perspective that the reader can interrogate. It is not prediction. Visual authority must never imply that a speculative analogy or a numerical match score is established fact.

## Working design persona

**Editorial product design director, with an information-design and accessibility practice.** Think like a journal editor deciding what deserves attention, a research librarian preserving provenance, and an interaction designer removing friction. This is a working perspective, not a claim of credentials or completed user research.

Responsibilities: understand the content before composing the interface; establish a hierarchy; explain uncertainty; make controls behave as advertised; examine mobile reading and keyboard interaction; verify every screen in a browser. Challenge impressive-looking elements that do no work.

Provisional reader persona: a curious, time-constrained reader who follows current affairs and wants more context than a news summary. They enter through a headline, ask “what has happened like this before?”, and need to distinguish a persuasive story from a supported comparison. This hypothesis is inferred from the application, not validated through interviews. Avoid calling every reader a scholar or archivist.

## Research and its application

Reviewed November 2, 2026. External examples inform a synthesis, not a template to copy.

- [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/). Start with the main task, then reveal secondary detail. Application: category navigation stays visible; strength/sort controls are optional; archive mechanics and discovery episodes sit below the main research experience.
- [NN/g: Aesthetic-usability effect](https://www.nngroup.com/articles/aesthetic-usability-effect/). Appearance affects perceived usability and can conceal friction. Application: visual polish is reviewed separately from whether a reader can search, open, save and recover from an error.
- [NN/g: Photos as web content](https://www.nngroup.com/articles/photos-as-web-content/). Relevant imagery earns attention; decorative filler is often ignored. Application: two real photographs illustrate the present/past concept; unrelated portrait photography is removed from the evidence explanation. Stock is labeled as illustration rather than represented as evidence.
- [GOV.UK: Start by learning user needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs). Product decisions should follow what people need to accomplish. Application: reading, investigating and saving define the information architecture. Interviews and task testing remain necessary after this expert review.
- [WCAG 2.2: Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Application: visible focus, explicit labels, generous controls, logical headings, reduced-motion support, reflow and contrast checks. Browser checks do not constitute a full accessibility certification.
- [Foreign Affairs](https://www.foreignaffairs.com/). Observed: clear priority between a leading argument, supporting stories and source attribution. Application: one lead comparison, quieter article rows, references near analysis.
- [Works in Progress](https://worksinprogress.co/). Observed in browser: assertive editorial art direction, confident image scale and restrained navigation. Application: a distinctive photographic present/past composition and fewer competing interface containers.
- [Our World in Data](https://ourworldindata.org/). Observed in browser: research can remain approachable while exposing supporting context. Application: evidence and caveats are integrated into the reading journey.
- [Are.na](https://www.are.na/). Observed: collecting and connecting are explicit activities. Application: “Saved” makes the personal library immediately understandable; public editorial collections remain separate.
- [The Economist: Marber](https://marber.economist.com/). A reference for coherent editorial systems across product surfaces. Application: common typography, navigation, controls and comparison components across every route.

### Anti-slop research

The supplied [Bootcamp article](https://medium.com/design-bootcamp/how-to-stop-your-frontend-looking-ai-generated-efbb9681a6a2), [Taste Skill reference](https://www.skills.sh/leonxlnx/taste-skill/design-taste-frontend), and [Kosta Canatselis essay](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c) share a useful diagnosis: an interface can be technically competent while lacking a reason for its choices. These are practitioner perspectives, not controlled usability evidence. A universal ban on specific fonts, colors or layouts would simply create another template.

For Tether, the practical failures were repeated rounded boxes, tiny all-caps labels, sparkle icons, oversized introductions, decorative graph lines, technical copy, unsupported confidence theater and controls with no meaningful outcome. The remedy is specific authorship: a comparison motif derived from the product, normal sentence case, a small semantic palette, a reading rhythm, truthful content and complete interaction states.

## Design concept: the distance between now and then

Two points connected by a thread form the brand mark and comparison motif. Modern events and historical cases occupy distinct, clearly named positions. The visual identity belongs to a contemporary publication rather than a simulation of an antique archive.

- Instrument Serif carries editorial headlines; DM Sans keeps controls, metadata and body text direct and legible. Roman text is the default; italics are reserved for occasional emphasis.
- Forest identifies actions and current context; clay identifies historical context; pale chartreuse marks small moments of emphasis. Paper is the reading surface. Color always has a role.
- Strong changes in scale establish hierarchy. Fine rules divide articles. Containers are reserved for interactive groups, evidence notes and states.
- Photography keeps its natural color and uses intentional crops. Never use a classical building as proof of a different historical event. Captions explicitly identify conceptual imagery.
- Motion is limited to focus, hover and state feedback. No scroll-reveal choreography or simulated network animation.

## Workflow changes beyond styling

1. Keep reading available without an account. Ask for sign-in at saving, retaining the destination.
2. Use distinct navigation labels: Today, Explore, Collections, Saved. Explain the latter two in their page introductions.
3. Keep freshness and data origin visible without turning the feed into an ingestion dashboard. Restrict administrative actions to administrator accounts.
4. Show the two events, connection, limitations and sources before advanced interpretation. Never hardcode a verified label in a deep dive.
5. Make collection stories open an actual archive search. Include an All filter and a genuine reset.
6. Remove the newsletter form until a subscription service exists. Replace placeholder settings with actual navigation to preferences and saved work.
7. Make preference selection optional, show the real one-step setup, and keep a clear continue action visible.
8. Distinguish search failure from no results. Explain the next useful action in both cases.

## Acceptance standard

Review landing, feed, exploration, search results, collections, deep dive, authentication, preferences, profile, saved content and password recovery. Check desktop, tablet and narrow mobile widths, keyboard focus, form labels, image availability, no horizontal overflow, freshness/caveat visibility, correct destinations, loading, empty and error states. Build and type-check the existing app.

## What should be asked next

Validate the reader hypothesis with 5–8 target readers using three tasks: find a useful comparison, explain why it may be wrong, save and return to it. Measure task success, comprehension of uncertainty, time to first useful comparison and return-to-saved success. Assess actual match quality separately: design cannot repair a weak historical analogy. Audit source provenance, freshness, image rights and production performance over real traffic. These are follow-up product research needs, not work claimed as completed here.
