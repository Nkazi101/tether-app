import test from "node:test";
import assert from "node:assert/strict";
import {
  researchHistory,
  validateResearchAssessment,
} from "../server/services/research";
import type { Store } from "../server/services/store";
import {
  comparisonFixture,
  lensFixture,
  presentSource,
} from "./fixtures/story-lens";
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

test("the planner runs before history search, records only current support and retains independent retrieval", async () => {
  const originalFetch = globalThis.fetch;
  const keys = [
    "MUSE_API_KEY",
    "MUSE_API_BASE_URL",
    "ANALYSIS_MODEL_ENABLED",
    "HISTORICAL_SEARCH_ENABLED",
  ];
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  try {
    Object.assign(process.env, {
      MUSE_API_KEY: "test-only-not-a-secret",
      MUSE_API_BASE_URL: "https://provider.invalid",
      ANALYSIS_MODEL_ENABLED: "true",
      HISTORICAL_SEARCH_ENABLED: "true",
    });
    for (const scenario of [
      { validPlan: true, repair: false },
      { validPlan: false, repair: false },
      { validPlan: true, repair: true },
    ]) {
      const { validPlan, repair } = scenario;
      const requests: Array<{ url: string; body: any }> = [];
      globalThis.fetch = async (url, init) => {
        assert.ok(
          String(url).startsWith("https://provider.invalid/"),
          "No external request is allowed in this test",
        );
        const body = JSON.parse(String(init?.body));
        requests.push({ url: String(url), body });
        if (requests.length === 1)
          return Response.json({
            choices: [
              {
                message: {
                  content: JSON.stringify(
                    validPlan
                      ? plan
                      : {
                          ...plan,
                          hypotheses: [
                            {
                              ...plan.hypotheses[0],
                              observation: {
                                ...lensFixture.present,
                                evidence: [
                                  {
                                    sourceId: "unread",
                                    passage:
                                      "This support was never retrieved.",
                                  },
                                ],
                              },
                            },
                          ],
                        },
                  ),
                },
              },
            ],
          });
        if (body.messages?.[0]?.content?.startsWith("Audit each proposed lens"))
          return Response.json({
            choices: [
              {
                message: {
                  content: JSON.stringify({
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
                          "The synthetic passages support this bounded current-only reading.",
                      },
                    ],
                  }),
                },
              },
            ],
          });
        if (requests.length >= 3) {
          const currentOnly = {
            ...lensFixture,
            historical: null,
            boundary: {
              claim:
                "This source does not establish a corresponding historical episode.",
              evidence: [
                {
                  sourceId: "present",
                  passage:
                    "Artists withhold recordings to seek better royalties.",
                },
              ],
            },
          };
          const assessment = {
            found: false,
            temporalStage: "unclear",
            summary:
              "A current-only reading can remain useful when historical pages are unavailable.",
            title: "",
            period: "",
            endYear: null,
            historicalEndDate: null,
            initialState: "",
            outcome: null,
            historicalSourceIds:
              repair && requests.length === 3 ? ["unread"] : [],
            sequence: [],
            correspondences: [],
            differences: [],
            unknowns: [],
            candidatesConsidered: [],
            indicators: [],
            narrative: null,
            lenses: [currentOnly],
          };
          assert.ok(requests.length <= 5, "At most one repair is allowed");
          return Response.json({
            choices: [{ message: { content: JSON.stringify(assessment) } }],
          });
        }
        assert.equal(requests.length, 2);
        return Response.json({
          output: [
            {
              type: "web_search_call",
              action: { type: "search", query: plan.materialQuery },
              results: [],
            },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "No readable historical pages in this synthetic test.",
                },
              ],
            },
          ],
        });
      };
      const store = {
        rpc: async () => true,
        researchLeads: async () => [],
      } as unknown as Store;
      const result = await researchHistory(
        store,
        { ...comparisonFixture(), lenses: [] },
        false,
      );
      assert.match(requests[0].url, /chat\/completions$/);
      assert.match(requests[1].url, /responses$/);
      assert.ok(
        !requests[0].body.messages[0].content.includes(
          "Fictional earlier recording dispute",
        ),
        "The preliminary prompt must not contain the historical candidate",
      );
      if (validPlan)
        assert.ok(requests[1].body.input.includes(plan.materialQuery));
      else
        assert.ok(
          requests[1].body.input.includes("independent material query"),
        );
      assert.equal(result.research?.status, "limited");
      assert.equal(Boolean(result.research?.narrativePlan), validPlan);
      assert.equal(
        result.lenses.length,
        1,
        "A separate final assessment can support a current-only reading",
      );
      assert.equal(result.lenses[0].historical, null);
      assert.equal(requests.length, repair ? 5 : 4);
      assert.equal(result.research?.assessmentAttempts, repair ? 2 : 1);
      assert.equal(result.research?.lensReview, "model-checked");
      assert.deepEqual(result.research?.queries, [plan.materialQuery]);
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test("an unsupported optional lens is withheld independently of a valid factual comparison", () => {
  const result = validateResearchAssessment(
    {
      found: false,
      temporalStage: "unclear",
      summary:
        "This synthetic investigation has not established a historical match.",
      title: "",
      period: "",
      endYear: null,
      historicalEndDate: null,
      initialState: "",
      outcome: null,
      historicalSourceIds: [],
      sequence: [],
      correspondences: [],
      differences: [],
      unknowns: [],
      candidatesConsidered: [],
      indicators: [],
      narrative: null,
      lenses: [lensFixture],
    },
    [presentSource],
    [],
  );
  assert.deepEqual(result.lenses, []);
  assert.match(result.unknowns[0], /withheld/);
});
