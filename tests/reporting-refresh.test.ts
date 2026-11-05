import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { processComparisonJob } from "../server/services/processor";
import { Store, hash, jobSchema } from "../server/services/store";
import { researchSchema, type Comparison, type EvidenceSource } from "../src/lib/comparison";
import { RESEARCH_VERSION } from "../server/services/episode-research";
import { comparisonFixture } from "./fixtures/story-lens";
import { pairFixture } from "./fixtures/pair";
import { historicalPacketKey } from "../server/services/episode-research";
import { ResearchDeferred } from "../server/domain/research-deferred";

function setup() {
  const previous = comparisonFixture();
  previous.archiveVersion = hash([]);
  previous.sources[0].url = "https://present.example.org/story?at_campaign=rss";
  previous.sources[0].retrieval = "article-text";
  previous.research = researchSchema.parse({ version: RESEARCH_VERSION, publicationStandard: "original-sources-1",
    id: randomUUID(), status: "searched", depth: 1, searchedAt: new Date().toISOString(),
    queries: [], sourcesLocated: 2, sourcesRead: 2, candidatesConsidered: [],
    model: "fixture", note: "An earlier completed test investigation." });
  const article = Object.fromEntries(Object.entries({ ...previous.sources[0],
    id: "new-article-id", url: "https://present.example.org/story",
    retrievedAt: new Date().toISOString() }).reverse()) as EvidenceSource;
  const feed = { ...article, id: "feed-item", summary: "A short feed excerpt describing the same reported situation.", retrieval: "feed-excerpt" };
  const job = jobSchema.parse({ id: randomUUID(), kind: "analysis", owner_key: "system:reporting",
    owner_user_id: null, status: "running", attempts: 1, lease_token: randomUUID(),
    result_id: null, error_message: null, created_at: new Date().toISOString(),
    payload: { input: feed.title, question: "A differently worded routine background question?",
      situationId: previous.situationId, sources: [feed] } });
  const published: Comparison[] = [];
  const calls: string[] = [];
  const store = { situation: async () => ({ id: previous.situationId, owner_key: job.owner_key,
      identity_key: "fixture", latest_analysis_id: previous.id, is_public: true }),
    analysis: async () => previous, cases: async () => [],
    publish: async (_job: unknown, value: Comparison) => { published.push(value); },
    rpc: async (name: string) => { calls.push(name); return true; },
  } as unknown as Store;
  return { previous, article, job, store, calls, published };
}

test("a changed feed excerpt rereads full text and retains an unchanged completed reading", async () => {
  const { previous, article, job, store, calls, published } = setup();
  let reads = 0;
  const result = await processComparisonJob(store, job, {
    fetchArticle: async () => { reads++; return article; },
    researchHistory: async () => { throw new Error("Unchanged evidence must not spend another model call."); },
  });
  assert.equal(reads, 1);
  assert.equal(result.id, previous.id);
  assert.deepEqual(result.lenses, previous.lenses);
  assert.deepEqual(calls, ["tether_reuse_job"]);
  assert.equal(published.length, 0);
});

test("a routine feed poll retains unchanged reporting across method and archive upgrades", async () => {
  const { previous, article, job, store } = setup();
  previous.research!.version = "episode-research-6";
  previous.research!.searchedAt = "2025-01-01T00:00:00.000Z";
  previous.archiveVersion = "older-archive";
  const result = await processComparisonJob(store, job, {
    fetchArticle: async () => article,
    researchHistory: async () => { throw new Error("Backfill, not ingestion, owns method migration."); },
  });
  assert.equal(result.id, previous.id);
});

test("changed article text triggers reassessment instead of retaining the earlier interpretation", async () => {
  const { previous, article, job, store, calls, published } = setup();
  let assessments = 0;
  const result = await processComparisonJob(store, job, {
    fetchArticle: async () => ({ ...article, summary: article.summary + " A materially new development." }),
    researchHistory: async (_store, value) => { assessments++; return value; },
  });
  assert.equal(assessments, 1);
  assert.notEqual(result.id, previous.id);
  assert.equal(result.previousId, previous.id);
  assert.ok(result.sources[0].summary.includes("materially new"));
  assert.equal(published.length, 1);
  assert.ok(!calls.includes("tether_reuse_job"));
});

test("a reader's different question still receives a fresh investigation for identical evidence", async () => {
  const { previous, job, store } = setup();
  job.owner_key = "reader:fixture";
  job.payload.researchFrom = previous.id;
  let assessments = 0;
  await processComparisonJob(store, job, {
    researchHistory: async (_store, value) => { assessments++; return value; },
  });
  assert.equal(assessments, 1);
});

test("an unchanged current-only reading survives a routine poll while its history search stays open", async () => {
  const { previous, article, job, store, published } = setup();
  previous.research!.status = "limited";
  const result = await processComparisonJob(store, job, {
    fetchArticle: async () => article,
    researchHistory: async () => { throw new Error("Routine polling must not discard a retained reading."); },
  });
  assert.equal(result.id, previous.id);
  assert.equal(published.length, 0);
});

test("explicit administrative reassessment bypasses routine evidence reuse", async () => {
  const { article, job, store } = setup();
  job.payload.forceReassessment = true;
  let assessments = 0;
  await processComparisonJob(store, job, {
    fetchArticle: async () => article,
    researchHistory: async (_store, value) => { assessments++; return value; },
  });
  assert.equal(assessments, 1);
});
test("an explicit inapplicable event decision is cached without claiming that a historical search ran", async () => {
  const { previous, article, job, store } = setup();
  previous.lenses = []; previous.primary = null;
  previous.research!.status = "unavailable";
  previous.research!.eventApplicability = "ineligible";
  const result = await processComparisonJob(store, job, { fetchArticle: async () => article,
    researchHistory: async () => { throw new Error("Unchanged reporting must not repeatedly spend a classification call."); } });
  assert.equal(result.id, previous.id);
  assert.equal(result.research?.status, "unavailable");
});

test("capacity deferral preserves checked current extraction and resumes only against identical evidence", async () => {
  const { previous, job, store } = setup();
  const f = pairFixture();
  previous.sources = f.base.sources;
  job.kind = "research";
  job.payload.sources = f.base.sources;
  job.payload.forceReassessment = true;
  const checkedResearch = { ...previous.research!, currentReview: "model-checked" as const,
    currentEvidenceFingerprint: historicalPacketKey(f.base.sources), frozenEpisodeHash: hash(f.now),
    diagnostic: { stage: "historical-discovery", code: "capacity" as const } };
  let deferred: ResearchDeferred | undefined;
  await assert.rejects(() => processComparisonJob(store, job, {
    researchHistory: async (_store, value) => ({ ...value, currentEpisode: f.now, research: checkedResearch }),
  }), error => { deferred = error as ResearchDeferred; return error instanceof ResearchDeferred; });
  assert.ok(deferred?.checkpoint);
  job.payload.currentCheckpoint = deferred.checkpoint;
  await processComparisonJob(store, job, {
    researchHistory: async (_store, value) => {
      assert.deepEqual(value.currentEpisode, f.now);
      assert.equal(value.research?.currentEvidenceFingerprint, historicalPacketKey(value.sources));
      return { ...value, currentEpisode: null, research: null };
    },
  });
  job.payload.sources = [{ ...f.base.sources[0], summary: f.base.sources[0].summary + " Materially new reporting." }];
  await processComparisonJob(store, job, {
    researchHistory: async (_store, value) => {
      assert.equal(value.currentEpisode, null, "Changed evidence cannot reuse the checkpoint.");
      return { ...value, research: null };
    },
  });
});
