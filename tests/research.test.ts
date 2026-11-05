import test from "node:test";
import assert from "node:assert/strict";
import {
  readSearchTrace,
  validateResearchAssessment,
} from "../server/services/research";
import type { EvidenceSource } from "../src/lib/comparison";
const source = (id: string, text: string): EvidenceSource => ({
  id,
  title: text,
  summary: text,
  publisher: id,
  url: `https://${id}.example.org`,
  kind: "historical-reference",
  publishedAt: null,
  retrievedAt: new Date().toISOString(),
});
const present = [
  source(
    "present",
    "Artists withhold recordings. A distributor controls access to listeners.",
  ),
];
const past = [
  source("archive", "Musicians stopped recording during a royalty dispute."),
  source("library", "Labels controlled access to recording distribution."),
];
function assessment() {
  return {
    found: true,
    summary:
      "A synthetic structural comparison for validating evidence references.",
    title: "The recording dispute",
    period: "1942–1944",
    endYear: 1944,
    historicalEndDate: null,
    initialState: "A dispute about recording and royalties.",
    outcome: null,
    historicalSourceIds: ["archive", "library"],
    sequence: [
      {
        stage: "Dispute",
        description: "Musicians withheld recordings.",
        sourceIds: ["archive"],
      },
    ],
    correspondences: [
      {
        relationship: "Withholding work changes leverage",
        presentEvidence: "Artists withhold recordings.",
        historicalEvidence: "Musicians stopped recording",
        presentSourceId: "present",
        historicalSourceIds: ["archive"],
      },
      {
        relationship: "Control of the distribution channel constrains choices",
        presentEvidence: "A distributor controls access to listeners.",
        historicalEvidence: "Labels controlled access",
        presentSourceId: "present",
        historicalSourceIds: ["library"],
      },
    ],
    differences: [
      "The contractual and legal setting differs.",
      "The distribution technology and replacement options differ.",
    ],
    unknowns: [],
    candidatesConsidered: ["The recording dispute"],
    indicators: [],
    narrative: null,
  };
}
test("search is never inferred from a model answer or citation alone", () => {
  assert.equal(
    readSearchTrace({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "A confident answer",
              annotations: [
                { type: "url_citation", url: "https://example.org" },
              ],
            },
          ],
        },
      ],
    }).searched,
    false,
  );
  const trace = readSearchTrace({
    output: [
      {
        type: "web_search_call",
        action: { type: "search", query: "recording bans historical sources" },
        results: [{ url: "https://archive.example.org", title: "Archive" }],
      },
      {
        type: "message",
        phase: "commentary",
        content: [{ type: "output_text", text: "I will search" }],
      },
      {
        type: "message",
        content: [{ type: "output_text", text: "Historical result" }],
      },
    ],
  });
  assert.equal(trace.searched, true);
  assert.deepEqual(trace.queries, ["recording bans historical sources"]);
  assert.equal(trace.text, "Historical result");
});
test("wider research works without a predefined mechanism category and checks actual passages", () => {
  assert.equal(
    validateResearchAssessment(assessment(), present, past).found,
    true,
  );
  assert.throws(() =>
    validateResearchAssessment(
      { ...assessment(), historicalSourceIds: ["invented"] },
      present,
      past,
    ),
  );
  assert.throws(() =>
    validateResearchAssessment(
      {
        ...assessment(),
        correspondences: [
          {
            ...assessment().correspondences[0],
            historicalEvidence: "A fabricated quotation",
          },
          assessment().correspondences[1],
        ],
      },
      present,
      past,
    ),
  );
  assert.throws(() =>
    validateResearchAssessment(
      { ...assessment(), differences: [] },
      present,
      past,
    ),
  );
});

test("a historical candidate must precede the present and use multiple source hosts", () => {
  assert.throws(() =>
    validateResearchAssessment(
      { ...assessment(), endYear: 2021 },
      present.map((s) => ({ ...s, publishedAt: "2020-01-01T00:00:00Z" })),
      past,
    ),
  );
  assert.throws(() =>
    validateResearchAssessment(
      assessment(),
      present,
      past.map((s) => ({
        ...s,
        url: "https://one-publisher.example.org/" + s.id,
      })),
    ),
  );
});

test("historical beats and interpretations stay within the selected case sources", () => {
  const extra = source("third", "A third account covers this episode’s settlement.");
  const allRead = [...past, extra];
  const withBeat = {
    ...assessment(),
    sequence: [
      ...assessment().sequence,
      { stage: "Settlement", description: extra.summary, sourceIds: [extra.id] },
    ],
  };
  assert.throws(
    () => validateResearchAssessment(withBeat, present, allRead),
    /sequence uses an unselected source/,
  );
  assert.equal(
    validateResearchAssessment(
      { ...withBeat, historicalSourceIds: ["archive", "library", extra.id] },
      present,
      allRead,
    ).found,
    true,
  );
  assert.throws(
    () => validateResearchAssessment(
      {
        ...assessment(),
        narrative: {
          title: "A proposed reading",
          interpretation: "An interpretation tied to the selected episode.",
          alternative: "A competing explanation of the episode.",
          evidenceSourceIds: [extra.id],
          status: "interpretation",
        },
      },
      present,
      allRead,
    ),
    /unselected historical source/,
  );
});

import { archiveResearchLeads } from "../server/services/research";
import { reviewedCases } from "../server/domain/cases";
test("archive lead retrieval includes cases outside the original mechanism taxonomy", () => {
  const unknownCase = {
    ...reviewedCases[2],
    id: "music-case",
    title: "Artists dispute royalties from recording distribution",
    family: "unknown" as const,
    signals: [],
    initialState:
      "Musicians withhold recordings during a dispute over royalty payments.",
  };
  const leads = archiveResearchLeads(
    {
      title: "Musicians withhold recordings in a royalty dispute",
      question: "What does the distribution dispute resemble?",
      sources: present,
    },
    [...reviewedCases, unknownCase],
  );
  assert.equal(leads[0].id, "music-case");
});

test("a failed optional interpretation does not erase a separately valid historical match", () => {
  const result = validateResearchAssessment(
    { ...assessment(), lenses: [{ title: "An unsupported lens" }] },
    present,
    past,
  );
  assert.equal(result.found, true);
  assert.equal(result.correspondences.length, 2);
  assert.deepEqual(result.lenses, []);
  assert.ok(result.unknowns.some((note) => note.includes("withheld")));
});

test("absence of a historical episode can use null metadata without inventing an episode", () => {
  const empty = {
    ...assessment(),
    found: false,
    title: null,
    period: null,
    initialState: null,
    endYear: null,
    historicalSourceIds: [],
    sequence: [],
    correspondences: [],
    differences: [],
  };
  const result = validateResearchAssessment(empty, present, []);
  assert.equal(result.title, "");
  assert.equal(result.period, "");
  assert.equal(result.found, false);
  assert.throws(() =>
    validateResearchAssessment({ ...assessment(), title: null }, present, past),
  );
});
