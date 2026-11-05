# Visual discovery: implementation verification

3 November 2026 · local development and compiled production app · real stored reporting.

## Delivered

- A new Discover feed: publisher photographs, an adjacent dated historical panel, a short takeaway on completed connection cards, topical browsing and the optional bring-a-story form.
- A new reader: The connection, What to watch, Sources & limits. The first material difference remains in the primary reading flow. Paired evidence, historical sequence and Jung-inspired interpretation each have a direct disclosure.
- Preserved exact-version saving, following, private refinements, research traces, earlier assessments, observations and the forecast journal. Saved and Following use the same visual cards.
- A modern shared visual system, semantic native controls and responsive layouts. No new UI framework or package was required.
- Publisher media metadata in RSS/article extraction, with a bounded cosmetic resolver for existing immutable records. New image endpoints do not call a model or rewrite evidence.
- The duplicate old reader was removed. Reusable comparison tools now live outside the page modules.

The research, rationale, alternatives and reader-testing protocol are in [the decision record](visual-discovery-research.md).

## Actual checks

| Check | Observed result |
| --- | --- |
| Strict TypeScript | Pass after the final component extraction. [Log](../../audit/visual-discovery/typecheck.log). |
| Unit/regression suite | 26 passed, 0 failed. Includes image-host safety, credential/private-host rejection, RSS size selection and credits, encoded tracking parameters, article metadata preservation and caption exclusion; existing historical evidence/citation regressions still pass. [Log](../../audit/visual-discovery/check.log). |
| Production build | Pass after the final UI changes. [Log](../../audit/visual-discovery/build.log). Upstream Node/Zod annotation warnings remain non-blocking. |
| Compiled production app | Served and inspected in the browser on temporary port 3101: visual feature, 24 cards, 9 completed-connection teasers, publisher images, no document overflow and no captured console errors. This is a snapshot of available data, not a promised count. |
| Production HTTP | Discover, database readiness, feed-media index and public detail-media endpoint returned 200. [Results](../../audit/visual-discovery/production-smoke.json). |
| Media ownership | A real private assessment requested without its owner session returned 404; a public assessment returned 200 with an image. Private IDs and material were not copied into this report. |
| Actual incomplete page supplied by user | Initial visible main content changed from 843 to 153 words, with an article photo and two secondary headings. Research incompleteness remains explicit; the detailed reason remains accessible under Sources & limits. |
| Completed connection | The word-of-the-year example has 212 words in the initial main view, a loaded publisher photograph, named/dated precedent, material difference and three reading destinations. Counts use rendered `main.innerText`; closed details are excluded. This is one illustrative case, not an average. |
| Responsive reflow | Tested at 1280px desktop and 390px/320px phone widths. A 3px category-strip overflow was found and fixed; final document widths equal viewport widths. Sources and the expanded submission form also fit at 320px. |
| Keyboard | Left/Right and Home/End change the selected reader tab and move focus. All tab `aria-controls` targets exist. Native disclosures expose evidence and narrative interpretation. |
| Paired evidence | The completed example opened three relationship pairs and six original-source links. The human-pattern disclosure explicitly separates interpretation from factual findings and supplies another explanation. |
| Forecast honesty | The tested retrospective/unclear assessment displays no invented future indicators. What to watch explains the limitation and preserves the optional personal journal. Unreviewed leads and walkthroughs also cannot expose the developing-event indicator view. |
| Save/sign-in journey | Save leads to sign-in with the exact story/tab in the return URL. Cancelling sign-in returns to that same story and Sources & limits tab. No account was created or credentials entered during testing. |
| Bring a story | The form opens from the sticky header while scrolled and returns to the top. Empty input leaves Search history disabled. No paid investigation was submitted for the redesign. |
| Category browsing | Tech changes the selected topic and corresponding stream; the narrow layout remains within the viewport. |
| Runtime | Development app and updated worker are running on the existing local setup; readiness and worker-heartbeat endpoints returned 200 after restart. The temporary production test process was stopped. |

These browser checks are not a full WCAG audit, performance benchmark, historian review or reader-comprehension study.

## Screenshots

[Desktop Discover](../../audit/visual-discovery/discover-desktop.png) · [Phone Discover](../../audit/visual-discovery/discover-mobile.png) · [Scrollable cards](../../audit/visual-discovery/discover-cards.png) · [Connection and difference](../../audit/visual-discovery/connection-reader.png).

## Practical limits

The redesign changes the presentation and reading path. Existing automatically authored prose can still be technical; the future research prompt now specifies plain, short explanations, but no new model output was commissioned to claim that instruction is effective. Match quality, independent historical review and current source coverage remain separate requirements.

The available researched sample did not contain a qualifying developing assessment with live indicators during this check. The real no-indicator state was tested; this report does not claim a browser test of a newly researched developing-event scenario. Existing regression checks remain in place for the underlying evidence logic.

Images are publisher-supplied when available. Missing or rejected metadata uses a stable labelled graphic fallback; the interface does not fabricate archive photography. Credits preserve the publisher and photographer when supplied. Publisher rights policies remain relevant for production distribution, as described in the decision record.

No new database migrations, model-budget changes or application dependencies were needed. The original evidence, immutable version semantics and broader historical-search gates remain in force. Independent reader testing is the next way to establish whether the experience delivers the intended change in interest and understanding.
