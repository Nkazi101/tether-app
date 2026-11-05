// Fictional material used only for validation and browser previews. Not a seed.
import { randomUUID } from "node:crypto";
import { buildComparison } from "../../server/domain/compare";
import {
  validateComparison,
  type EvidenceSource,
} from "../../src/lib/comparison";
import {
  validateStoryLenses,
  type StoryLens,
} from "../../src/lib/story-lenses";
export const presentSource: EvidenceSource = {
  id: "present",
  title: "Design fixture: creators challenge a distributor",
  summary:
    "The distributor calls itself an underdog. It controls access to listeners. Artists withhold recordings to seek better royalties. Talks resumed after the stoppage.",
  publisher: "Fictional design fixture",
  url: "https://present.example.org",
  publishedAt: "2026-11-03T10:00:00Z",
  retrievedAt: "2026-11-03T12:00:00Z",
  kind: "reporting",
};
export const historicalSources: EvidenceSource[] = [
  {
    ...presentSource,
    id: "archive",
    title: "Fictional earlier recording dispute",
    publisher: "Fictional archive",
    url: "https://archive.example.org",
    kind: "historical-reference",
    publishedAt: null,
    summary:
      "Musicians stopped recording during a royalty dispute. Labels controlled access to recording distribution. The musicians negotiated through a recognised union.",
  },
  {
    ...presentSource,
    id: "library",
    title: "Fictional agreement",
    publisher: "Fictional library",
    url: "https://library.example.org",
    kind: "historical-reference",
    publishedAt: null,
    summary:
      "The union and labels agreed new recording terms after negotiations.",
  },
];
export const claim = (text: string, sourceId: string, passage: string) => ({
  claim: text,
  evidence: [{ sourceId, passage }],
});
export const lensFixture: StoryLens = {
  version: 1,
  pattern: "old-and-new",
  title: "The underdog who holds the gate",
  insight:
    "The distributor presents itself as the outsider, but it controls the route to listeners. The dispute is also a contest over who gets to define fairness.",
  basis: "actions-and-framing",
  scope:
    "A reading of the claims and actions in this fictional source; audience beliefs are not established.",
  present: claim(
    "The distributor claims the underdog role while controlling distribution.",
    "present",
    "The distributor calls itself an underdog. It controls access to listeners.",
  ),
  historical: claim(
    "The earlier dispute also paired withheld work with control over distribution.",
    "archive",
    "Musicians stopped recording during a royalty dispute. Labels controlled access to recording distribution.",
  ),
  roles: [
    {
      actor: "The distributor",
      castBy: "the distributor itself",
      role: "Underdog",
      portrayal: claim(
        "It describes itself as the underdog in this dispute.",
        "present",
        "The distributor calls itself an underdog.",
      ),
      power: claim(
        "It controls access to listeners, a concrete form of gatekeeping.",
        "present",
        "It controls access to listeners.",
      ),
    },
    {
      actor: "The artists",
      castBy: "Tether’s interpretation of their action",
      role: "Challengers",
      portrayal: claim(
        "They challenge the terms by withholding recordings.",
        "present",
        "Artists withhold recordings to seek better royalties.",
      ),
      power: claim(
        "They can withhold new recordings; the source does not establish the strength of alternatives.",
        "present",
        "Artists withhold recordings to seek better royalties.",
      ),
    },
  ],
  stage: {
    label: "escalation",
    reading: claim(
      "Work has been withheld and talks have resumed; the conflict is still being negotiated.",
      "present",
      "Talks resumed after the stoppage.",
    ),
  },
  signals: [],
  alternative: claim(
    "This can also be read as a royalty negotiation whose outcome depends on bargaining leverage, regardless of the underdog framing.",
    "present",
    "Artists withhold recordings to seek better royalties.",
  ),
  boundary: {
    claim:
      "The earlier musicians negotiated through a recognised union. This account does not establish equivalent organisation today, so similar pressure need not yield the same terms.",
    evidence: [
      {
        sourceId: "present",
        passage: "Artists withhold recordings to seek better royalties.",
      },
      {
        sourceId: "archive",
        passage: "The musicians negotiated through a recognised union.",
      },
    ],
  },
};
export function comparisonFixture() {
  const base = buildComparison({
    situationId: randomUUID(),
    snapshotId: randomUUID(),
    title: presentSource.title,
    question: "What is the human story taking shape?",
    sources: [presentSource],
    cases: [],
    mode: "reporting",
  });
  return validateComparison({
    ...base,
    topic: "culture",
    summary:
      "A fictional comparison used to inspect the reader; not a published historical claim.",
    lenses: validateStoryLenses(
      [lensFixture],
      [presentSource],
      historicalSources,
    ),
    primary: {
      id: "fictional-case",
      version: "fixture-1",
      title: "An earlier recording dispute (fictional)",
      period: "1940s · design fixture",
      family: "unknown",
      signals: [],
      initialState:
        "Musicians withheld recordings while labels controlled distribution.",
      sequence: [
        {
          stage: "Negotiation",
          description: "The union and labels negotiated terms.",
          sourceIds: ["library"],
        },
      ],
      outcome: "An agreement in this fictional fixture.",
      boundaries: [lensFixture.boundary.claim],
      sources: historicalSources,
      review: "web-researched",
      reviewNote: "Synthetic preview only; not real research.",
      narrative: null,
    },
    differences: [lensFixture.boundary.claim],
    narrative: null,
  });
}
