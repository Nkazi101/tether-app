import test from "node:test";
import assert from "node:assert/strict";
import { historicalReadPlan } from "../server/domain/historical-read-plan";

test("historical acquisition keeps candidate source pairs together and refuses unsearched URLs", () => {
  const trace = ["https://noise.example/unrelated", "https://records.example/case", "https://scholar.example/same-case", "https://archive.example/other-case", "https://reporter.example/other-case"];
  const plan = JSON.stringify({ candidates: [
    { title: "first", urls: [trace[1], trace[2], "https://invented.example/unsearched"] },
    { title: "second", urls: [trace[3], trace[4]] },
  ] });
  assert.deepEqual(historicalReadPlan(plan, trace, 4), [trace[1], trace[2], trace[3], trace[4]]);
  assert.ok(!historicalReadPlan(plan, trace).some(url => url.includes("invented")));
  assert.deepEqual(historicalReadPlan("Older plain search report", trace, 2), trace.slice(0, 2));
});
