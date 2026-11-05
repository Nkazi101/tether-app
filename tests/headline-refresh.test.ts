import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { processComparisonJob } from "../server/services/processor";
import { Store, jobSchema } from "../server/services/store";
import { type Comparison } from "../src/lib/comparison";
import { comparisonFixture } from "./fixtures/story-lens";

function setup() {
  const previous = comparisonFixture();
  previous.title = "The earlier feed headline";
  previous.sources[0].retrieval = "article-text";
  const job = jobSchema.parse({
    id: randomUUID(), kind: "analysis", owner_key: "system:reporting",
    owner_user_id: null, status: "running", attempts: 1,
    lease_token: randomUUID(), result_id: null, error_message: null,
    created_at: new Date().toISOString(),
    payload: { input: previous.sources[0].title, question: previous.question,
      situationId: previous.situationId, researchFrom: previous.id, refreshHeadline: true },
  });
  const published: Comparison[] = [];
  const store = {
    situation: async () => ({ id: previous.situationId, owner_key: job.owner_key,
      identity_key: "reporting:fixture", latest_analysis_id: previous.id, is_public: true }),
    analysis: async () => previous,
    publish: async (_job: unknown, comparison: Comparison) => { published.push(comparison); },
    cases: async () => { throw new Error("A headline-only correction must not enter research or archive retrieval."); },
    rpc: async () => true,
  } as unknown as Store;
  return { previous, job, store, published };
}

test("headline correction versions the sourced title while preserving the complete reading", async () => {
  const { previous, job, store, published } = setup();
  const original = structuredClone(previous);
  const result = await processComparisonJob(store, job);
  assert.equal(result.title, previous.sources[0].title);
  assert.equal(result.previousId, previous.id);
  assert.notEqual(result.id, previous.id);
  assert.equal(result.evidenceCutoff, previous.evidenceCutoff);
  assert.deepEqual(result.lenses, previous.lenses);
  assert.deepEqual(result.primary, previous.primary);
  assert.deepEqual(result.sources, previous.sources);
  assert.deepEqual(previous, original);
  assert.equal(published.length, 1);
});

test("headline-only correction refuses changed reporting instead of preserving an obsolete reading", async () => {
  const { previous, job, store, published } = setup();
  const newer = structuredClone(previous);
  newer.id = randomUUID();
  newer.sources[0].summary += " Materially different reporting.";
  const situation = store.situation.bind(store);
  store.situation = async (id) => ({ ...(await situation(id))!, latest_analysis_id: newer.id });
  store.analysis = async (id) => id === previous.id ? previous : newer;
  await assert.rejects(processComparisonJob(store, job), /reporting changed/);
  assert.equal(published.length, 0);
});

test("private jobs cannot invoke the administrative headline shortcut", async () => {
  const { job, store, published } = setup();
  job.owner_key = "reader:fixture";
  await assert.rejects(processComparisonJob(store, job), /headline refresh is unavailable/);
  assert.equal(published.length, 0);
});

test("headline correction cannot publish a private system-owned report", async () => {
  const { job, store, published } = setup();
  const situation = store.situation.bind(store);
  store.situation = async (id) => ({ ...(await situation(id))!, is_public: false });
  await assert.rejects(processComparisonJob(store, job), /reporting changed/);
  assert.equal(published.length, 0);
});

test("publication distinguishes headline changes in otherwise identical snapshot inputs", async () => {
  const { previous, job } = setup();
  const snapshots: Array<{ fingerprint: string; title: string }> = [];
  const store = new Store({} as Store["db"]);
  store.rpc = async <T>(_name: string, args: Record<string, unknown> = {}) => {
    snapshots.push(args.p_snapshot as { fingerprint: string; title: string });
    return previous.id as T;
  };
  await store.publish(job, previous, "fixture", true);
  const changed = { ...previous, title: previous.sources[0].title };
  await store.publish(job, changed, "fixture", true);
  assert.notEqual(snapshots[0].fingerprint, snapshots[1].fingerprint);
  assert.equal(snapshots[1].title, changed.title);
});
