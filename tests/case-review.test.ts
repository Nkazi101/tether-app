import test from "node:test";
import assert from "node:assert/strict";
import { reviewedCases } from "../server/domain/cases";
import { validateCasePublication } from "../server/domain/case-review";
const item = reviewedCases[1];
const review = () => ({
  historicalCase: item,
  reviewer: "Synthetic reviewer fixture",
  reviewedAt: "2026-11-02T00:00:00Z",
  notes:
    "Synthetic publication contract, not a new independent historical review.",
  support: item.signals.map((signal) => ({
    signal,
    sourceId: item.sources[0].id,
    passage: item.sources[0].summary,
  })),
});
test("case publication requires traceable support and independent publisher breadth", () => {
  assert.equal(validateCasePublication(review()).historicalCase.id, item.id);
  assert.throws(() => validateCasePublication({ ...review(), support: [] }));
  assert.throws(() =>
    validateCasePublication({
      ...review(),
      historicalCase: { ...item, sources: [item.sources[0]] },
    }),
  );
  assert.throws(() =>
    validateCasePublication({
      ...review(),
      support: [
        {
          signal: item.signals[0],
          sourceId: "invented",
          passage: "A fabricated observation.",
        },
      ],
    }),
  );
  assert.throws(() =>
    validateCasePublication({
      ...review(),
      historicalCase: {
        ...item,
        sequence: [
          {
            stage: "Later",
            description: "A claim without a valid citation.",
            sourceIds: ["invented"],
          },
        ],
      },
    }),
  );
});

import { Store } from "../server/services/store";
import type { SupabaseClient } from "@supabase/supabase-js";
test("a corrupt generated case is quarantined without blocking valid cases", async () => {
  const recorded: unknown[] = [];
  const db = {
    from: (table: string) => ({
      upsert: async (row: unknown) => {
        assert.equal(table, "tether_case_quarantine");
        recorded.push(row);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
  const store = new Store(db);
  const invalid = {
    ...review(),
    historicalCase: { ...item, sources: [item.sources[0], item.sources[0]] },
  };
  assert.equal(
    await store.checkedCase({
      id: "00000000-0000-4000-8000-000000000001",
      payload: invalid,
    }),
    null,
  );
  assert.equal(recorded.length, 1);
  assert.equal(
    (
      await store.checkedCase({
        id: "00000000-0000-4000-8000-000000000002",
        payload: review(),
      })
    )?.id,
    item.id,
  );
});

test("automatically researched archive entries cannot count a Wikipedia mirror as corroboration", () => {
  const candidate = review();
  assert.throws(() =>
    validateCasePublication({
      ...candidate,
      historicalCase: {
        ...item,
        review: "web-researched",
        sources: item.sources.map((source, index) => ({
          ...source,
          url:
            index === 0
              ? "https://en.wikipedia.org/wiki/Test"
              : "https://en-academic.com/Test",
        })),
      },
    }),
  );
});
