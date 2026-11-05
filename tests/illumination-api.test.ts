import test from "node:test";
import {narrativeContextFixture} from "./fixtures/narrative-context";
import assert from "node:assert/strict";
import express from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLivingApi } from "../server/api";
import { pairFixture } from "./fixtures/pair";
import { matchEpisodes } from "../server/domain/structure-match";
import { caseSchema, validateComparison } from "../src/lib/comparison";

test("version-specific feedback enforces session isolation, access, rate limits and deletion", async () => {
  const f = pairFixture();
  const pair = { version: 1, current: f.now, historical: f.past, alignment: matchEpisodes(f.now, f.past), reading: f.reading,
    selection: { candidatesEncoded: 1, candidatesMatched: 1, method: "ordered-relations-2", review: "automated-source-and-claim-check", note: "Synthetic API fixture; it makes no historical or source-entailment claim." } };
  let comparison = validateComparison({ ...f.base, currentEpisode: f.now, pairedStory: pair, primary: caseSchema.parse({ id: "fixture", version: "v1", episode: f.past, title: f.past.title, period: f.past.period, family: "unknown", signals: [], initialState: f.past.conflict.text, sequence: [], outcome: null, boundaries: [f.reading.differences[0].implication], sources: f.historical, review: "web-researched", reviewNote: "Synthetic test fixture only.", narrative: null }) });
  let publicSituation = true, allowance = true;
  const rows = new Map<string, Record<string, unknown>>();
  const db = {
    auth: { getUser: async () => ({ data: { user: null }, error: new Error("invalid") }) },
    rpc: async () => ({ data: allowance, error: null }),
    from(table: string) {
      const filters: Record<string, string> = {}; let deleting = false;
      const query = {
        select: () => query,
        eq: (key: string, value: string) => { filters[key] = value; return query; },
        delete: () => { deleting = true; return query; },
        maybeSingle: async () => ({ data: table === "tether_analyses" ? (filters.id === comparison.id ? { payload: comparison } : null) : table === "tether_situations" ? { id: comparison.situationId, identity_key: "fixture", owner_key: "guest:someone-else", owner_user_id: null, title: comparison.title, latest_analysis_id: comparison.id, is_public: publicSituation } : rows.get(filters.owner_key+'|'+filters.case_id) || null, error: null }),
        upsert: async (value: Record<string, unknown>) => { rows.set(String(value.owner_key)+'|'+value.case_id, value); return { error: null }; },
        then: (resolve: (value: unknown) => void) => { if (deleting) rows.delete(filters.owner_key+'|'+filters.case_id); resolve({ error: null }); },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const app = express(); app.use(express.json()); app.use("/api", createLivingApi(db));
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number }, url = `http://127.0.0.1:${address.port}/api/analyses/${comparison.id}/illumination`;
  const request = (method: string, cookie = "", body?: unknown, extra: Record<string, string> = {}) => fetch(url, { method, headers: { "Content-Type": "application/json", cookie, ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const start = await request("GET"), cookie = start.headers.get("set-cookie")!.split(";")[0];
    assert.equal(start.status, 200); assert.equal((await start.json()).feedback, null);
    const input = { verdict: "helpful", reason: "difference", pattern: "The same pressure has different limits.", explanationSeen: true };
    assert.equal((await request("PUT", cookie, input)).status, 200);
    assert.equal((await fetch(url+'?case=not-present',{headers:{cookie}})).status,404);
    assert.equal((await fetch(url+'?case=fixture',{headers:{cookie}})).status,200);
    assert.equal(rows.size, 1);
    const row = [...rows.values()][0];
    assert.equal(row.analysis_id, comparison.id); assert.equal(row.case_version, "v1"); assert.equal(String(row.pair_fingerprint).length, 64);
    assert.deepEqual((await (await request("GET", cookie)).json()).feedback, input);
    assert.equal((await (await request("GET")).json()).feedback, null);
    await request("DELETE"); assert.equal(rows.size, 1);
    assert.equal((await request("PUT", cookie, { ...input, owner_key: "someone else" })).status, 400);
    assert.equal((await request("PUT", cookie, input, { origin: "https://another-site.org" })).status, 403);
    allowance = false; assert.equal((await request("PUT", cookie, input)).status, 429); allowance = true;
    publicSituation = false; assert.equal((await request("GET", cookie)).status, 404);
    assert.equal((await request("DELETE", cookie)).status, 404); publicSituation = true;
    assert.equal((await request("DELETE", cookie)).status, 200); assert.equal(rows.size, 0);
    const context=narrativeContextFixture(),other={...context.historical,id:'second-case',version:'second-version'};
    comparison=validateComparison({...context.base,currentFrame:context.current,narrativeLens:{...context.lens,parallels:[context.lens.parallels[0],{...context.lens.parallels[0],caseId:other.id}]},primary:context.historical,alternatives:[{historicalCase:other,reason:'Synthetic second-case isolation fixture only.'}]});
    const contextUrl=`http://127.0.0.1:${address.port}/api/analyses/${comparison.id}/illumination`;
    const castVote=(caseId:string,verdict:string)=>fetch(contextUrl+'?case='+caseId,{method:'PUT',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify({...input,verdict})});
    assert.equal((await castVote(context.historical.id,'helpful')).status,200);
    assert.equal((await castVote(other.id,'unhelpful')).status,200);assert.equal(rows.size,2);
    const response=await fetch(contextUrl+'?case='+other.id,{headers:{cookie}});assert.equal((await response.json()).feedback.verdict,'unhelpful');
    await fetch(contextUrl+'?case='+other.id,{method:'DELETE',headers:{cookie}});assert.equal(rows.size,1);
    assert.equal([...rows.values()][0].case_id,context.historical.id);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
