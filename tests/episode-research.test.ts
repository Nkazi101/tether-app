import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { researchHistory, historicalPacketKey } from "../server/services/episode-research";
import { buildComparison } from "../server/domain/compare";
import { Store } from "../server/services/store";
import { randomUUID } from "node:crypto";
import { episode, sources } from "./fixtures/episodes";
import { sourceSchema, validateComparison } from "../src/lib/comparison";
import { validatePairedStory, illuminationSchema } from "../src/lib/paired-story";

import { pairFixture } from "./fixtures/pair";

async function run(review: { approve: boolean; issues: string[]; omitContinuationImplication?: boolean; omissionReason?: string } = { approve: true, issues: [] }, eligible = true, laterChapter = false, historicalAccepted = true, invalidReviewedCandidate = false) {
  const f = pairFixture(), prompts: string[] = [], reservations: string[] = [];
  if (laterChapter) {
    f.past.beats.push({ id: "b4", when: "Afterward", summary: "The company and workers signed an agreement over deliveries.", basis: "reported-action", anchorIds: ["b"] });
    f.past.relations.push({ id: "r4", beatId: "b4", from: "firm", predicate: "agrees", to: "workers", layer: "actions", allegedConduct: null, anchorIds: ["b"] });
    f.reading.continuation = { historicalBeatIds: ["b4"], implication: "The current company may lack the money needed to reach an agreement." };
  }
  const responses = [{ eligible, reason: "A bounded sequence of documented actions.", episode: eligible ? f.now : null }, { episode: f.now, issues: [] }, { candidates: [{ episode: f.past, sourceIds: ["archive1", "archive2"] }] }, { episodes: historicalAccepted ? [...(invalidReviewedCandidate ? [{...f.past,id:"unproposed-case"}] : []),f.past] : [], issues: historicalAccepted ? [] : ["The proposed actors and actions are not supported."] }, f.reading, review];
  const store = { rpc: async (_name: string, args: Record<string, unknown>) => { reservations.push(String(args.p_key)); return true; } } as unknown as Store;
  const env = { key: process.env.MUSE_API_KEY, enabled: process.env.ANALYSIS_MODEL_ENABLED, search: process.env.HISTORICAL_SEARCH_ENABLED };
  process.env.MUSE_API_KEY = "test-only"; process.env.ANALYSIS_MODEL_ENABLED = "true"; process.env.HISTORICAL_SEARCH_ENABLED = "true";
  try {
    const result = await researchHistory(store, f.base, false, 1, [], {
      fetch: (async (url, init) => {
        const body = JSON.parse(String(init?.body));
        if (String(url).endsWith("/responses")) {
          prompts.push(body.input);
          return Response.json({ output: [{ type: "web_search_call", action: { type: "search", query: "delivery withholding earlier disputes" }, results: f.historical.map(s => ({ url: s.url })) }] });
        }
        prompts.push(body.messages[0].content);
        return Response.json({ choices: [{ message: { content: JSON.stringify(responses.shift()) } }] });
      }) as typeof fetch,
      fetchArticle: async url => f.historical.find(s => s.url === url)!,
    });
    return { result, prompts, reservations, f };
  } finally {
    for (const [key, value] of Object.entries({ MUSE_API_KEY: env.key, ANALYSIS_MODEL_ENABLED: env.enabled, HISTORICAL_SEARCH_ENABLED: env.search })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
test("the pipeline freezes current evidence, searches, encodes, maps, writes and reviews before publication", async () => {
  const { result, prompts, reservations, f } = await run();
  assert.equal(prompts.length, 7);
  assert.ok(!prompts[0].includes("earlier workers stop deliveries"));
  assert.ok(prompts[1].includes("BEFORE historical retrieval"));
  assert.ok(prompts[2].includes("FROZEN ANONYMOUS EVENT:"));
  assert.ok(!prompts[2].includes('"title":"current workers'));
  assert.ok(!prompts[3].includes('"id":"current"'));
  assert.ok(!prompts[4].includes('"id":"current"'));
  assert.equal(result.research?.historicalReview, "model-checked");
  assert.deepEqual(result.currentEpisode, { ...f.now, encoding: "typed-relations-2" });
  assert.equal(result.pairedStory?.alignment.counts.beats, 3);
  assert.equal(result.research?.lensReview, "model-checked");
  assert.equal(reservations.filter(k => k === "model:calls").length, 7);
  assert.equal(result.research?.currentReview, "model-checked");
  validateComparison(result);
});
test("a failed claim review withholds the pair while retaining current extraction and search scope", async () => {
  const { result } = await run({ approve: false, issues: ["The union contrast is unsupported by the supplied facts."] });
  assert.equal(result.pairedStory, null);
  assert.equal(result.primary, null);
  assert.ok(result.currentEpisode);
  assert.equal(result.research?.queries.length, 1);
  assert.match(result.research!.note, /withheld/);
});
test("one invalid historical review cannot erase another valid reviewed candidate", async () => {
  const {result} = await run({approve:true,issues:[]},true,false,true,true);
  assert.ok(result.pairedStory);
  assert.match(result.research!.historicalReviewIssues!.join(" "), /cannot substitute/);
});
test("thin or inapplicable reporting never triggers a fabricated historical search", async () => {
  const { result, prompts } = await run({ approve: true, issues: [] }, false);
  assert.equal(prompts.length, 1);
  assert.equal(result.primary, null);
  assert.equal(result.research?.sourcesRead, 0);
});
test("a pair cannot use its matched ending as a later outcome or replace the frozen current graph", async () => {
  const { result } = await run();
  const pair = result.pairedStory!;
  assert.throws(() => validatePairedStory({ ...pair, reading: { ...pair.reading, continuation: { historicalBeatIds: ["b3"], implication: "This same result may occur in the present dispute." } } }, result.sources, result.primary!.sources), /later historical beat/);
  assert.throws(() => validateComparison({ ...result, currentEpisode: { ...result.currentEpisode!, title: "An altered extraction after seeing history" } }), /frozen/);
  assert.throws(() => illuminationSchema.parse({ verdict: "accurate", explanationSeen: true }), z.ZodError);
  assert.throws(() => illuminationSchema.parse({ verdict: "helpful", explanationSeen: true, owner_key: "another reader" }), z.ZodError);
});
test("an unsupported optional implication is removed without erasing sourced historical facts or a sound core pair", async () => {
  const { result } = await run({ approve: true, issues: [], omitContinuationImplication: true, omissionReason: "The present funding claim has no support." }, true, true);
  assert.ok(result.pairedStory);
  assert.equal(result.pairedStory.reading.continuation?.implication, null);
  assert.deepEqual(result.pairedStory.reading.continuation?.historicalBeatIds, ["b4"]);
  assert.match(result.primary!.outcome!, /signed an agreement/);
  assert.equal(result.research?.optionalOmissions?.[0].field, "continuation.implication");
});
test("retained encodings preserve the pre-history hash and can skip extraction only for identical source evidence", async () => {
  const { result, f } = await run();
  const cached = { currentFingerprint: historicalPacketKey(result.sources), depth: 1, searchedAt: result.research!.searchedAt, queries: result.research!.queries, sourcesLocated: 2, sources: f.historical, report: "An actual-search trace supplied by this synthetic test." };
  const encoded = { current: result.currentEpisode!, historical: [result.primary!.episode!] };
  const original = { key: process.env.MUSE_API_KEY, enabled: process.env.ANALYSIS_MODEL_ENABLED, search: process.env.HISTORICAL_SEARCH_ENABLED };
  process.env.MUSE_API_KEY = "test-only"; process.env.ANALYSIS_MODEL_ENABLED = "true"; process.env.HISTORICAL_SEARCH_ENABLED = "true";
  let calls = 0;
  const store = { rpc: async () => true } as unknown as Store;
  const dependencies = { historicalCache: cached, encodedCache: encoded, readingCache: result.pairedStory!, retainedSnapshot: result,
    fetch: (async () => { calls++; return Response.json({ choices: [{ message: { content: JSON.stringify({ approve: true, issues: [] }) } }] }); }) as typeof fetch,
    fetchArticle: async () => { throw new Error("A retained-packet check must not silently claim a new source read."); } };
  try {
    const next = await researchHistory(store, { ...f.base, research: result.research }, false, 1, [], dependencies);
    assert.equal(calls, 1);
    assert.equal(next.research?.frozenEpisodeHash, result.research!.frozenEpisodeHash);
    assert.equal(next.research?.reusedEncodingFrom, result.research!.id);
    assert.ok(next.pairedStory);
    calls = 0;
    const mismatch = await researchHistory(store, { ...result, research: result.research }, false, 1, [], { ...dependencies, historicalCache: { ...cached, currentFingerprint: "0".repeat(64) } });
    assert.equal(calls, 0);
    assert.equal(mismatch.pairedStory, null);
    const changedHistory = await researchHistory(store, { ...f.base, research: result.research }, false, 1, [], { ...dependencies, encodedCache: { ...encoded, historical: [{ ...encoded.historical[0], title: "A different unreviewed encoding" }] } });
    assert.equal(calls, 0);
    assert.equal(changedHistory.pairedStory, null);
  } finally {
    for (const [key, value] of Object.entries({ MUSE_API_KEY: original.key, ANALYSIS_MODEL_ENABLED: original.enabled, HISTORICAL_SEARCH_ENABLED: original.search })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});


test("a failed source-only historical check withholds an otherwise structurally matching episode", async () => {
  const { result, prompts } = await run({ approve: true, issues: [] }, true, false, false);
  assert.equal(result.pairedStory, null);
  assert.equal(result.primary, null);
  assert.equal(result.research?.historicalReview, "withheld");
  assert.equal(result.research?.currentReview, "model-checked");
  assert.equal(prompts.length, 5);
});

test('a source-encoded library match does not require a fresh web search before it can be checked',async()=>{
 const {result,f}=await run();
 const base={...result,pairedStory:null,primary:null,research:{...result.research!,currentEvidenceFingerprint:historicalPacketKey(result.sources)}};
 const calls:string[]=[];const replies=[result.pairedStory!.reading,{approve:true,issues:[]}];
 const env={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED,search:process.env.HISTORICAL_SEARCH_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';process.env.HISTORICAL_SEARCH_ENABLED='true';
 try{
  const next=await researchHistory({rpc:async()=>true} as unknown as Store,base,false,1,[result.primary!],{fetch:(async(url,init)=>{assert.ok(!String(url).endsWith('/responses'),'A local match should not pay for an unrelated web search');calls.push(String(init?.body));return Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]});}) as typeof fetch,fetchArticle:async()=>{throw new Error('No live page was fetched.');}});
  assert.ok(next.pairedStory);assert.equal(calls.length,2);assert.equal(next.research?.sourceAcquisition,'encoded-library');assert.equal(next.research?.sourcesRead,0);assert.equal(next.research?.libraryCasesChecked,1);assert.deepEqual(next.currentEpisode,result.currentEpisode);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:env.key,ANALYSIS_MODEL_ENABLED:env.enabled,HISTORICAL_SEARCH_ENABLED:env.search})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('a rejected local reading makes one wider search without repeating current extraction',async()=>{
 const {result}=await run();
 const base={...result,pairedStory:null,primary:null,research:{...result.research!,currentEvidenceFingerprint:historicalPacketKey(result.sources)}};
 const env={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED,search:process.env.HISTORICAL_SEARCH_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';process.env.HISTORICAL_SEARCH_ENABLED='true';
 let calls=0,searches=0;
 try{
  const wider=await researchHistory({rpc:async()=>true} as unknown as Store,base,false,1,[result.primary!],{fetch:(async(url)=>{
   calls++;
   if(String(url).endsWith('/responses')){searches++;return Response.json({output:[{type:'web_search_call',action:{type:'search',query:'distant episode with same relationships'},results:[]}]});}
   return Response.json({choices:[{message:{content:JSON.stringify(calls===1?result.pairedStory!.reading:{approve:false,issues:['The proposed shared reading is not established.']})}}]});
  }) as typeof fetch});
  assert.equal(calls,3);assert.equal(searches,1);assert.equal(wider.pairedStory,null);
  assert.equal(wider.research?.frozenEpisodeHash,result.research?.frozenEpisodeHash);
  assert.match(wider.research!.candidateChecks![0].reason,/claim review withheld/);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:env.key,ANALYSIS_MODEL_ENABLED:env.enabled,HISTORICAL_SEARCH_ENABLED:env.search})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
