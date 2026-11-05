# Public historical reuse profile

`server/services/historical-reuse.ts` supplies a read-only publication-frequency signal. It is separate from source qualification, structural fit, historical independence and reader usefulness.

```ts
const profile = await getHistoricalReuseProfile(store);
const discoveryLeads = profile.topRepeated;
const previousUses = profile.countFor(candidateCase);
```

`getHistoricalReuseProfile(Store): Promise<HistoricalReuseProfile>` coalesces concurrent loads on the same Store/database. A successful snapshot lives for 30 seconds after completion. Failed loads are evicted and throw; failure never returns a fabricated zero-use profile. Caches do not cross Store objects or database-client replacements.

The profile exposes:

- `generatedAt`: capture timestamp.
- `headsScanned`: number of bounded current public heads examined.
- `headsWithHistoricalReading`: heads with a primary case and a narrative or ordered comparison.
- `truncated`: another public head was present beyond the 500-head limit.
- `incomplete`: truncation, missing analyses, invalid metadata, or incomplete alias evidence occurred.
- `missingAnalyses`, `invalidRows`, `aliasProjectionIncomplete`: counts explaining incomplete data.
- `entries`: groups sorted by distinct current-situation count, descending.
- `topRepeated`: at most 12 groups used by two or more current situations.
- `countFor(case)`: distinct current public situations using the supplied case or its conservative aliases.

Each `HistoricalReuseEntry` contains `id`, `title`, `period`, `startYear`, `endYear`, `count`, `situationCount`, `domains` and `caseIds`. `count` is primary appearances among selected heads. It is not a view count, a frequency in all history, a match score or a reason to ban a case.

The scan examines up to 500 recent public, non-walkthrough heads with selected analyses, plus one sentinel for truncation. It deliberately does not filter `has_aligned_pair`: demoting a pre-policy comparison must not conceal its remaining use. Each fetched analysis must belong to the selected situation. Analysis metadata is loaded in batches of 50 IDs obtained from those public heads. Projection includes historical case names, dates, source IDs/URLs and short evidence passages; it excludes full historical source bodies, article bodies and current-event text.

Alias grouping reuses the pure `sameHistoricalEpisode` helper in `src/lib/historical-episode-identity.ts` (also re-exported by `discovery-diversity.ts`). Identical IDs count as the same case. Differently named IDs require identical bounded date spans and at least two matching source-anchored passages. A broad shared reference page or a similar title is insufficient. This deliberately conservative rule can miss paraphrased aliases or changed bounds; stable canonical episode identifiers remain the durable solution. An eighth-index source or tenth-index historical fact is a projection sentinel and marks alias information incomplete rather than silently claiming full coverage.

These are selected current-head counts, including earlier methods still present in those heads. The profile does not scan every immutable historical analysis version, count secondary comparisons, prove that a repeated match was bad, or measure reader exposure. Use it to request broader historical discovery and to resolve otherwise-qualified ties; do not let novelty override evidence or structural fit.
