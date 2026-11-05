# Redesign verification

> Earlier iteration. The current form factor and its evidence are documented in [visual discovery research](visual-discovery-research.md) and [verification](visual-discovery-verification.md).

Completed November 2, 2026, against the local application. See [design direction](redesign-direction.md) for research, working persona, design principles, and follow-up product work.

## Implementation

Rebuilt the landing page, navigation, feed, exploration and search results, collections, comparison, saved reading, authentication, preferences, profile and password recovery. Added shared editorial components, semantic style tokens, a custom Tether mark, a favicon and three locally served stock photographs. Added route-based code splitting and page titles. Existing backend services and authorization boundaries remain in use.

The feed separates a current story from its historical perspective. It retains data origin, freshness and limitations. Unrelated default Unsplash imagery is not displayed as news photography. Collection entries use actual archive dates instead of unrelated photographs; the collection feature uses a clearly captioned library image.

Removed nonfunctional newsletter and settings interactions. Collection entries now open archive searches. Search queries survive in the URL. Sign-in keeps the comparison destination. Preferences are optional, persist existing choices, handle failed saves, and prevent replacing preferences when the existing values fail to load. Save controls acknowledge success. Password recovery retains its success screen after the recovery flag clears.

## Checks completed

- `npx tsc --noEmit`: passed.
- `npm run build`: passed. Route splitting removed the previous large-chunk build warning. Main JavaScript output is approximately 476 kB uncompressed / 140 kB gzip, with views loaded separately.
- `git diff --check`: passed.
- Browser layouts checked at 320, 390, 768 and 1440 CSS pixels. A feed overflow at 320px was found, corrected and rechecked, including the expanded filters. No document overflow remained in the checked layouts.
- Visual screenshots reviewed for landing, feed, exploration, results, collections, comparison, authentication, saved reading, preferences, profile and password success. Images verified to load; local stock assets were visually inspected.
- Keyboard entry reaches the skip link with a visible focus indicator. Reduced-motion mode suppresses transitions. Inputs have labels and icon actions have accessible names.
- axe-core 4.10.3 checks using WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags reported zero violations on the checked landing, feed, exploration, collections, comparison, authentication, preferences, saved-empty and profile screens. This is automated coverage, not a full accessibility audit or assistive-technology study.

## Workflow checks

Public flows used the existing local application APIs: evidence filters, reset, collection-to-search navigation, query persistence, actual search results, result-to-comparison navigation, source display and save-to-sign-in destination retention.

Authenticated flows used an isolated browser context, synthetic user, intercepted authentication responses and in-memory API fixtures. No real account or database records were modified by these checks. Passed: save a comparison, display it in Saved, remove it, show an actionable empty state, select preferences, fail the first save, retry successfully, restore the selected preferences, navigate from profile to preferences, sign out and complete password recovery with a visible success screen.

Network-state fixtures verified that feed failure displays explicitly labeled examples, search failure displays a retry state, empty search results are distinct from errors, editing returns focus to the input, and collection failure offers retry. Existing production authentication, email delivery and database policies were not end-to-end tested with real credentials.

## Material product findings

The existing data contains high-ranked comparisons whose own caveats describe weak overlap. Some deep dives provide generic or incomplete present-day context and few references. The feed also has an older data timestamp than the current date. The redesign exposes these limitations and avoids stronger “verified” language in the main UI. This task did not change the classification model, archive corpus, ingestion schedule or provider configuration. Editorial review of match quality, source coverage and current-event freshness is still necessary.

The proposed reader persona is a product hypothesis. No reader interviews or moderated usability sessions were conducted. Validate comprehension of uncertainty and the find/open/save/return journey with target readers before treating the design as empirically validated.

## Review artifacts

Screenshots are in `audit/redesign/`. Files ending in `fixture` contain isolated synthetic test data; other screenshots show the local application and its current archive data. The local preview server was used for QA and can be restarted with `npm run dev`.
