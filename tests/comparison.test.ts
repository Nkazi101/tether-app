import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  extractContext,
  validateExtractedContext,
} from "../server/domain/context";
import {
  buildComparison,
  reviseComparison,
  rankCases,
} from "../server/domain/compare";
import { reviewedCases, energySources } from "../server/domain/cases";
import {
  analysisRequestSchema,
  brierScore,
  validateComparison,
  type EvidenceSource,
} from "../src/lib/comparison";
import { isSameReportingEpisode } from "../server/domain/reporting";
const source = (text: string): EvidenceSource => ({
  id: "input",
  title: text,
  summary: text,
  publisher: "Your description",
  url: null,
  publishedAt: null,
  retrievedAt: new Date().toISOString(),
  kind: "user-description",
});
function analyze(text: string) {
  return buildComparison({
    situationId: randomUUID(),
    snapshotId: randomUUID(),
    title: text,
    question: "What is the relevant historical relationship?",
    sources: [source(text)],
    cases: reviewedCases,
    mode: "text",
  });
}

test("military strike and European Union meeting do not become labor disputes", () => {
  for (const input of [
    "Military forces prepare to strike across the border.",
    "European Union leaders meet for talks.",
  ]) {
    const comparison = analyze(input);
    assert.notEqual(comparison.context.family, "labor");
    assert.notEqual(comparison.primary?.id, "flint-1937");
    assert.notEqual(comparison.state, "supported");
  }
});
test("the actual gas-price failure retrieves energy evidence, not a labor dispute", () => {
  const comparison = analyze(
    "European gas prices soar to four-year high over winter supply fears. Jump fuelled by fears of further Middle East supply disruptions amid reports of US-Israeli plans to strike Iran.",
  );
  assert.equal(comparison.context.family, "supply");
  assert.ok(
    ["energy-europe-2022", "oil-embargo-1973"].includes(
      comparison.primary?.id || "",
    ),
  );
  assert.equal(comparison.state, "partial");
});
test("action reversal is preserved and a routine opening abstains", () => {
  const reversal = analyze(
    "A regulator abandons an antitrust case against a dominant technology platform.",
  );
  assert.equal(reversal.context.direction, "reversing");
  assert.equal(reversal.primary, null);
  assert.equal(analyze("The city opens a new public library.").primary, null);
});
test("labor requires the relationship, and a company IPO does not become the printing press", () => {
  assert.equal(
    analyze(
      "Factory workers stop production and strike while bargaining for union recognition and better conditions.",
    ).primary?.id,
    "flint-1937",
  );
  assert.equal(
    analyze(
      "Anthropic is preparing to go public. A look at the company IPO plan.",
    ).primary,
    null,
  );
});
test("two independent source publishers can support a reviewed correspondence without self-matching", () => {
  const comparison = buildComparison({
    situationId: randomUUID(),
    snapshotId: randomUUID(),
    title: "Europe’s 2022 supply shock",
    question: "What does import dependence explain?",
    sources: energySources.map((item) => ({ ...item, kind: "reporting" })),
    cases: reviewedCases,
    mode: "walkthrough",
  });
  assert.equal(comparison.primary?.id, "oil-embargo-1973");
  assert.equal(comparison.state, "supported");
  assert.ok(comparison.differences.length);
  assert.equal(validateComparison(comparison).id, comparison.id);
});
test("adding unrelated archive records cannot increase confidence or supported state", () => {
  const sources = [source("A war disrupts imported natural gas supplies.")];
  const context = extractContext(sources);
  const ranked = rankCases(context, sources, reviewedCases);
  const unrelated = Array.from({ length: 300 }, (_, index) => ({
    ...reviewedCases[2],
    id: `unrelated:${index}`,
    signals: [] as (typeof reviewedCases)[2]["signals"],
  }));
  assert.equal(
    rankCases(context, sources, [...reviewedCases, ...unrelated])[0]
      .historicalCase.id,
    ranked[0].historicalCase.id,
  );
  assert.equal(
    rankCases(context, sources, [...reviewedCases, ...unrelated])[0].score,
    ranked[0].score,
  );
});
test("model output must contain actual cited passages; null knowledge is not filled with personas", () => {
  const sources = [source("A war disrupts imported natural gas supplies.")];
  const context = extractContext(sources);
  assert.throws(() =>
    validateExtractedContext(
      {
        ...context,
        signals: [
          {
            key: "supply-disruption",
            evidence: "A fabricated blockade of the only port",
            sourceId: "input",
          },
        ],
      },
      sources,
    ),
  );
  assert.equal(context.actors.length, 0);
  assert.equal(analyze("The city opens a new public library.").narrative, null);
});
test("a challenging observation produces a traceable revision without overwriting the earlier analysis", () => {
  const previous = analyze("A war disrupts imported natural gas supplies.");
  const original = JSON.stringify(previous);
  const id = randomUUID();
  const revised = reviseComparison(
    previous,
    {
      id,
      indicatorId: "lost-supply",
      direction: "weakens",
      text: "The operator reports that the pipeline has reopened and replacement supplies are arriving.",
      sourceUrl: "https://example.org/operator",
      observedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      authorKind: "reader",
    },
    randomUUID(),
  );
  assert.equal(JSON.stringify(previous), original);
  assert.equal(revised.previousId, previous.id);
  assert.ok(revised.change?.observationIds.includes(id));
  assert.ok(revised.summary.includes("challenges"));
  assert.equal(revised.sources.at(-1)?.kind, "user-description");
});
test("broken citations, oversized input and fabricated supported results are rejected", () => {
  assert.equal(
    analysisRequestSchema.safeParse({ input: "x".repeat(12001) }).success,
    false,
  );
  const comparison = analyze("A war disrupts imported natural gas supplies.");
  assert.throws(() =>
    validateComparison({
      ...comparison,
      correspondences: [
        {
          relationship: "unsupported",
          presentEvidence: "x",
          historicalEvidence: "y",
          presentSourceId: "missing",
          historicalSourceIds: ["also-missing"],
        },
      ],
    }),
  );
  assert.throws(() =>
    validateComparison({
      ...analyze("A public library opens in the city."),
      state: "supported",
    }),
  );
});
test("proper binary scoring includes confident errors", () => {
  assert.equal(brierScore(1, 0), 1);
  assert.equal(brierScore(0, 0), 0);
  assert.equal(brierScore(0.5, 1), 0.25);
});
test("negation, averted action and restored supply do not masquerade as escalation", () => {
  for (const text of [
    "Factory workers will not strike after bargaining for union recognition and better pay.",
    "No gas supply shortage is expected and imported supplies continue normally.",
    "The government denies plans to file an antitrust lawsuit against a dominant platform.",
    "Imported gas supplies were restored after the pipeline disruption.",
  ])
    assert.equal(analyze(text).primary, null, text);
});
test("one broad relationship cannot turn a report into a historical parallel", () => {
  assert.equal(
    analyze("A survey finds that voters believe monopoly power has increased.")
      .primary,
    null,
  );
  assert.equal(
    analyze("Military troops gather near a border amid a diplomatic dispute.")
      .primary,
    null,
  );
});
test("corroboration requires a close episode and never merges distant dates or merely a shared category", () => {
  const current = source(
    "European gas supply disruption exposes dependence on Russian pipeline imports.",
  );
  current.url = "https://example.org/a";
  current.publishedAt = "2026-11-01T00:00:00Z";
  current.kind = "reporting";
  const comparison = buildComparison({
    situationId: randomUUID(),
    snapshotId: randomUUID(),
    title: current.title,
    question: "What matters?",
    sources: [current],
    cases: reviewedCases,
    mode: "reporting",
  });
  assert.equal(
    isSameReportingEpisode(
      {
        ...current,
        title:
          "Russian pipeline imports disruption exposes European gas supply dependence.",
        url: "https://another.example/b",
      },
      comparison,
    ),
    true,
  );
  assert.equal(
    isSameReportingEpisode(
      {
        ...current,
        title: "Oil supply disruption hits a different continent.",
        url: "https://another.example/c",
      },
      comparison,
    ),
    false,
  );
  assert.equal(
    isSameReportingEpisode(
      {
        ...current,
        publishedAt: "2020-01-01T00:00:00Z",
        url: "https://another.example/d",
      },
      comparison,
    ),
    false,
  );
});
