import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestReporting} from '../server/services/ingestion';
import {NARRATIVE_RESEARCH_VERSION} from '../server/services/narrative-research';
import type {Store} from '../server/services/store';

test('new feed research has a method-specific identity so retired jobs cannot suppress it',async()=>{
 const original=globalThis.fetch,calls:Array<Record<string,any>>=[];
 const xml=`<rss><channel><item><title>A reported institutional dispute</title><link>https://www.bbc.com/news/articles/test-research-identity</link><description>The parties dispute who controls access to the service and have agreed to further talks.</description><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`;
 globalThis.fetch=(async()=>new Response(xml)) as typeof fetch;
 try{
  await ingestReporting({rpc:async(_name:string,args:Record<string,any>)=>{calls.push(args);return null;}} as unknown as Store);
  const research=calls.filter(c=>c.p_kind==='research');
  assert.equal(research.length,1);
  assert.equal(research[0].p_payload.method,NARRATIVE_RESEARCH_VERSION);
  assert.ok(research[0].p_key.includes(NARRATIVE_RESEARCH_VERSION));
 }finally{globalThis.fetch=original;}
});
