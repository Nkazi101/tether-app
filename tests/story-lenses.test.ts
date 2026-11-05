import test from "node:test";
import assert from "node:assert/strict";
import { validateComparison } from "../src/lib/comparison";
import {
  validateStoryLenses,
  validateNarrativePlan,
} from "../src/lib/story-lenses";
import {
  comparisonFixture,
  presentSource,
  historicalSources,
  lensFixture,
  claim,
} from "./fixtures/story-lens";

const validate = (lens: unknown) =>
  validateStoryLenses([lens], [presentSource], historicalSources);
test("a lens grounds the claimed role, actual power, rival and historical break separately", () => {
  assert.equal(
    validate(lensFixture)[0].roles[0].castBy,
    "the distributor itself",
  );
  assert.equal(comparisonFixture().lenses.length, 1);
});
test("legacy snapshots remain readable without promoting their narrative to a grounded lens", () => {
  const { lenses: _lenses, ...legacy } = comparisonFixture();
  legacy.narrative = {
    title: "Legacy interpretation",
    interpretation: "An older speculative reading.",
    alternative: "A different speculative reading.",
    evidenceSourceIds: ["present"],
    status: "interpretation",
  };
  const result = validateComparison(legacy);
  assert.deepEqual(result.lenses, []);
  assert.ok(result.narrative);
});
test("lens source checks reject fabricated support and evidence from the wrong time or candidate", () => {
  assert.throws(() =>
    validate({
      ...lensFixture,
      present: claim(
        "A fabricated current claim",
        "present",
        "This never appeared in the source.",
      ),
    }),
  );
  assert.throws(() =>
    validate({ ...lensFixture, present: lensFixture.historical }),
  );
  assert.throws(() =>
    validateStoryLenses([lensFixture], [presentSource], [historicalSources[1]]),
  );
  assert.throws(() =>
    validate({
      ...lensFixture,
      roles: [
        {
          ...lensFixture.roles[0],
          power: claim(
            "The actor has absolute power",
            "unread",
            "It controls access to listeners.",
          ),
        },
      ],
    }),
  );
});
test("every lens needs a substantive rival and a historical difference with support from each episode", () => {
  assert.throws(() => validate({ ...lensFixture, alternative: null }));
  assert.throws(() =>
    validate({
      ...lensFixture,
      boundary: {
        ...lensFixture.boundary,
        evidence: [lensFixture.boundary.evidence[0]],
      },
    }),
  );
  assert.throws(() =>
    validate({
      ...lensFixture,
      boundary: {
        ...lensFixture.boundary,
        evidence: [lensFixture.boundary.evidence[1]],
      },
    }),
  );
});
test("an unmatched reading cannot borrow the authority of an unrelated historical source or illustration", () => {
  const currentOnly = {
    ...lensFixture,
    historical: null,
    boundary: claim(
      "The source does not establish equivalent organisation or a historical match.",
      "present",
      "Artists withhold recordings to seek better royalties.",
    ),
  };
  assert.equal(
    validateStoryLenses([currentOnly], [presentSource], [])[0].historical,
    null,
  );
  assert.throws(() =>
    validate({ ...currentOnly, boundary: lensFixture.boundary }),
  );
  assert.throws(() =>
    validateStoryLenses(
      [currentOnly],
      [{ ...presentSource, kind: "illustration" }],
      [],
    ),
  );
});
test("pre-search hypotheses require actual current passages, can abstain and cannot cite past outcomes", () => {
  const plan = {
    hypotheses: [
      {
        title: "Claimed outsider and gatekeeper",
        observation: lensFixture.present,
        query:
          "historical distribution gatekeeper claims outsider role recording dispute",
        disconfirmingQuestion: "Does it lack practical control over access?",
      },
    ],
    materialQuery:
      "recording dispute distribution bargaining historical institutions",
    counterQuery:
      "recording dispute with alternative distribution and different outcome",
  };
  assert.equal(
    validateNarrativePlan(plan, [presentSource]).hypotheses.length,
    1,
  );
  assert.deepEqual(
    validateNarrativePlan({ ...plan, hypotheses: [] }, [presentSource])
      .hypotheses,
    [],
  );
  assert.throws(() =>
    validateNarrativePlan(
      {
        ...plan,
        hypotheses: [
          { ...plan.hypotheses[0], observation: lensFixture.historical },
        ],
      },
      [presentSource],
    ),
  );
});

test("projection and grandiosity cannot publish on rhetoric alone", () => {
  for (const kind of ["projection", "grandiosity"]) {
    const signal = {
      kind,
      title: "A proposed deeper reading",
      observation: lensFixture.present,
      pairedObservation: null,
      reading:
        "An explicitly interpretive explanation of the observed wording.",
      alternative: "Strategic rhetoric may explain the same observation.",
      limitation:
        "This does not establish an unconscious motive or predictive value.",
    };
    assert.throws(() => validate({ ...lensFixture, signals: [signal] }));
    assert.throws(() =>
      validate({
        ...lensFixture,
        signals: [{ ...signal, pairedObservation: lensFixture.present }],
      }),
    );
  }
});

import { reviseComparison } from "../server/domain/compare";
import { randomUUID } from "node:crypto";
test("a challenging reader observation suspends the old lens pending reassessment", () => {
  const previous = comparisonFixture();
  previous.indicators = [
    {
      id: "leverage",
      label: "Distribution leverage",
      question: "Does the distributor still control access?",
      strengthens: "Access remains dependent on it.",
      weakens: "Artists find another route to listeners.",
      sourceGuidance:
        "Look for independently documented distribution agreements.",
      horizonDays: 30,
    },
  ];
  const revised = reviseComparison(
    previous,
    {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      authorKind: "reader",
      indicatorId: "leverage",
      direction: "weakens",
      text: "Artists report finding a different route to their listeners.",
    },
    randomUUID(),
  );
  assert.deepEqual(revised.lenses, []);
  assert.equal(previous.lenses.length, 1);
  assert.ok(revised.unknowns.some((item) => item.includes("suspended")));
});

test("actual lens validation handles surrounding quotation marks without accepting paraphrases", () => {
  const formatted = {
    ...lensFixture,
    present: {
      ...lensFixture.present,
      evidence: [
        {
          sourceId: "present",
          passage: '"The distributor calls itself an underdog."',
        },
      ],
    },
  };
  assert.equal(validate(formatted).length, 1);
  assert.throws(() =>
    validate({
      ...formatted,
      present: {
        ...formatted.present,
        evidence: [
          {
            sourceId: "present",
            passage: '"The distributor has no power at all."',
          },
        ],
      },
    }),
  );
});
