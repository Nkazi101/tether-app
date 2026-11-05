# Structural candidate ranking: software checks

The v11 retrieval failure removed a potentially stronger source-qualified case before the comparison writer could see it. Mechanism and role tags were useful leads, but their top-eight ordering was being treated as if it established structural relevance.

`tests/structural-candidate-ranking.test.ts` checks the replacement helper's admission and bookkeeping. It confirms that a supplied candidate beyond the old eight-case prefix can be returned, that the frozen current frame and historical records remain unchanged, and that downstream code receives the proposed directed relationship and its consequential limit.

Unknown case IDs, unseen cases beyond the pool cap, invented fact IDs, repeated candidate IDs and fewer than two distinct facts on either side cannot enter the selected list. A genuine empty result remains empty. A wholly invalid response or a provider failure remains an execution problem rather than being relabelled as historical novelty. Empty and singleton pools avoid unnecessary ranking calls. Examination and truncation are reported, and reuse counts do not create an automatic ban.

These eleven scripted tests do not establish that a model will choose the best analogy. Their synthetic candidates deliberately isolate the retrieval mechanics. A real recovery test on the known Kardashian/Reefer Madness failure is guided regression evidence, not a held-out historical-accuracy estimate.

The helper's 80-case cap must remain visible. Once the eligible archive exceeds it, a prefix cannot be described as all of history or all eligible cases. Larger archives need broader indexed recall and benchmarks that include surface-similar decoys, reversed causal relationships, observer-only mappings, same-person continuations and materially different outcomes. Category and exposure diversity should organise already qualified matches, not replace source quality or directed structural fit.


Proven aliases now collapse before applying the candidate cap or calling the model. The pure identity rule lives in `src/lib/historical-episode-identity.ts`, with compatibility re-exports from `discovery-diversity.ts`. Retrieval order's first qualified record is retained. The ranking result reports `aliasesCollapsed`; `eligible` counts the remaining episode identities. No archive record is deleted or rewritten.

The rule remains conservative: same ID, or identical bounded dates plus two matching passages attached to the same actual source URLs. Sharing a broad history page is insufficient. The pool-cap fixtures use distinct synthetic periods, source pages and passages; different labels on copies of one record no longer masquerade as eighty different episodes.
