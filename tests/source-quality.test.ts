import test from "node:test";
import assert from "node:assert/strict";
import { historicalSources, presentSource } from "./fixtures/story-lens";
import { validateStoryLenses } from "../src/lib/story-lenses";
import {
  hasHistoricalFoundation,
  independentHistoricalSources,
  isHistoricalMirror,
  historicalSourceOrigin,
} from "../server/domain/source-quality";
import { applyLensReview } from "../server/domain/lens-review";
import { lensFixture } from "./fixtures/story-lens";
test("Wikipedia mirrors and BBC domain variants cannot satisfy independent-source breadth", () => {
  for (const urls of [
    [
      "https://en.wikipedia.org/wiki/example",
      "https://en-academic.com/example",
    ],
    ["https://www.bbc.com/article", "https://www.bbc.co.uk/article"],
    ["https://www.bbc.com/article", "https://news.bbc.co.uk/article"],
    ["https://en.wikipedia.org/wiki/example", "https://en.wikiwand.com/example"],
  ])
    assert.equal(
      independentHistoricalSources(
        historicalSources.map((s, i) => ({ ...s, url: urls[i] })),
      ).length,
      1,
    );
});
test("publisher subdomain handling keeps lookalike domains distinct", () => {
  assert.equal(isHistoricalMirror("https://en.wikiwand.com/example"), true);
  assert.equal(isHistoricalMirror("https://notwikiwand.com/example"), false);
  assert.equal(historicalSourceOrigin("https://notbbc.com/example"), "notbbc.com");
});
test("substantially copied historical text is detected across otherwise different hosts", () => {
  const summary = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
  assert.equal(
    independentHistoricalSources(
      historicalSources.map((s, i) => ({
        ...s,
        summary: summary + (i ? " extra content" : ""),
      })),
    ).length,
    1,
  );
  assert.equal(independentHistoricalSources(historicalSources).length, 2);
});
test("claim review can remove unsupported details while preserving the original snapshot", () => {
  const reviewed = applyLensReview([lensFixture], {
    reviews: [
      {
        lensIndex: 0,
        keep: true,
        insight:
          "An explicitly bounded interpretation of the distributor’s public position.",
        omitStage: true,
        omitRoles: [1],
        omitPower: [0],
        omitSignals: [],
        reason: "The passage supports the role but not a chronological stage.",
      },
    ],
  });
  assert.equal(reviewed[0].stage, null);
  assert.equal(reviewed[0].roles.length, 1);
  assert.equal(reviewed[0].roles[0].power, null);
  assert.ok(lensFixture.stage);
  assert.equal(lensFixture.roles.length, 2);
  assert.ok(lensFixture.roles[0].power);
  assert.throws(() => applyLensReview([lensFixture], { reviews: [] }));
});

import {
  normaliseEvidenceText,
  normaliseEvidencePassage,
} from "../src/lib/evidence-text";
test("layout word joiners and enclosing quote marks do not create false missing-passage errors", () => {
  const body = normaliseEvidenceText(
    "The statement was “Consultations are very \u2060intensive.” More followed.",
  );
  assert.ok(
    body.includes(
      normaliseEvidencePassage('"Consultations are very intensive."'),
    ),
  );
  assert.ok(
    !body.includes(normaliseEvidencePassage("Consultations are now finished.")),
  );
  assert.ok(
    !body.includes(normaliseEvidencePassage("Consultations very intensive.")),
  );
});

test("an editorially narrowed lens must still pass the original provenance checks", () => {
  const corrected = { ...lensFixture, stage: null, roles: [] };
  const result = applyLensReview([lensFixture], {
    reviews: [
      {
        lensIndex: 0,
        keep: true,
        insight: null,
        omitStage: false,
        omitRoles: [],
        omitPower: [],
        omitSignals: [],
        reason:
          "The narrative can remain after unsupported optional details are removed.",
        revisedLens: corrected,
      },
    ],
  });
  assert.equal(result[0].stage, null);
  assert.equal(result[0].roles.length, 0);
  assert.equal(
    validateStoryLenses(result, [presentSource], historicalSources).length,
    1,
  );
  assert.throws(() =>
    validateStoryLenses(
      [
        {
          ...result[0],
          present: {
            ...result[0].present,
            evidence: [
              { sourceId: "unread", passage: "This evidence was never read." },
            ],
          },
        },
      ],
      [presentSource],
      historicalSources,
    ),
  );
});


test("different domains alone cannot establish an original historical foundation", () => {
  const secondary = historicalSources.map(source => ({ ...source, historicalProvenance: { role: "secondary" as const, note: "A retrospective guide that cites earlier reporting.", basisPassage: null, checkedBy: "automated-triage" as const } }));
  assert.equal(independentHistoricalSources(secondary).length, 2);
  assert.equal(hasHistoricalFoundation(secondary), false);
  const claimedOriginal = { ...secondary[0], historicalProvenance: { ...secondary[0].historicalProvenance, role: "original-reporting" as const, basisPassage: "This identifying passage does not appear in the source." } };
  assert.equal(hasHistoricalFoundation([claimedOriginal]), false);
  assert.equal(hasHistoricalFoundation([{ ...claimedOriginal, historicalProvenance: { ...claimedOriginal.historicalProvenance, basisPassage: claimedOriginal.summary.slice(0, 70) } }]), true);
  assert.equal(hasHistoricalFoundation([{ ...claimedOriginal, historicalProvenance: { ...claimedOriginal.historicalProvenance, checkedBy: "agent-source-audit" } }]), true);
});
