import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {processComparisonJob} from '../server/services/processor';
import {NARRATIVE_RESEARCH_VERSION} from '../server/services/narrative-research';
import {jobSchema,type Store} from '../server/services/store';
import {researchSchema,type Comparison,type EvidenceSource} from '../src/lib/comparison';
import {comparisonFixture} from './fixtures/story-lens';

function setup(){
 const previous=comparisonFixture();
 previous.createdAt='2026-11-04T12:10:00Z';
 previous.archiveVersion='earlier-archive';
 previous.inputMode='reporting';
 previous.sources[0]={...previous.sources[0],url:'https://present.example.org/story',
  publishedAt:'2026-11-04T09:30:00Z',retrievedAt:'2026-11-04T12:00:00Z',retrieval:'article-text'};
 previous.research=researchSchema.parse({version:NARRATIVE_RESEARCH_VERSION,id:randomUUID(),status:'searched',depth:1,
  searchedAt:previous.createdAt,queries:[],sourcesLocated:2,sourcesRead:2,candidatesConsidered:[],model:'fixture',note:'Completed synthetic current-method investigation.'});
 const feed:EvidenceSource={...previous.sources[0],id:'older-feed',url:'https://present.example.org/story?utm_source=rss#feed',
  title:'An earlier feed headline about the same reported situation',summary:'An older and shorter feed description of the reporting.',
  retrievedAt:'2026-11-04T09:55:00Z',retrieval:'feed-excerpt'};
 const job=jobSchema.parse({id:randomUUID(),kind:'research',owner_key:'system:reporting',owner_user_id:null,
  status:'running',attempts:1,lease_token:randomUUID(),result_id:null,error_message:null,created_at:'2026-11-04T10:00:00Z',
  payload:{input:feed.title,question:'Which earlier episode could explain this reported situation?',sources:[feed]}});
 const head={id:previous.situationId,owner_key:'system:reporting',identity_key:'fixture',latest_analysis_id:previous.id,is_public:true};
 const calls:Array<{name:string;args:Record<string,unknown>}>=[],published:Comparison[]=[];
 let archiveReads=0,articleReads=0,assessments=0;
 const store={byIdentity:async()=>null,findReportingSituation:async()=>head,situation:async()=>head,
  analysis:async()=>previous,cases:async()=>{archiveReads++;return[];},
  rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return true;},
  publish:async(_job:unknown,value:Comparison)=>{published.push(value);},
 } as unknown as Store;
 const run=()=>processComparisonJob(store,job,{
  fetchArticle:async url=>{articleReads++;return {...previous.sources[0],url,
   id:'new-article',retrievedAt:'2026-11-04T14:00:00Z',summary:previous.sources[0].summary+' A materially new documented development.'};},
  researchHistory:async(_store,value)=>{assessments++;return value;},
 });
 return{previous,feed,job,store,calls,published,run,counts:()=>({archiveReads,articleReads,assessments})};
}

test('an older origin-less feed research job reuses a newer full current-method reading without reads, spend or a new head',async()=>{
 const f=setup();assert.equal(f.job.payload.situationId,undefined);assert.equal(f.job.payload.researchFrom,undefined);
 const original=structuredClone(f.previous);const result=await f.run();
 assert.equal(result.id,f.previous.id);assert.deepEqual(f.previous,original);
 assert.deepEqual(f.counts(),{archiveReads:0,articleReads:0,assessments:0});assert.equal(f.published.length,0);
 assert.deepEqual(f.calls,[{name:'tether_reuse_job',args:{p_id:f.job.id,p_lease:f.job.lease_token,p_result:f.previous.id}}]);
});

test('identical supplied evidence can reuse the completed reading even when its capture predates the queued job',async()=>{
 const f=setup();f.previous.sources[0].retrievedAt='2026-11-04T09:00:00Z';f.previous.sources[0].publishedAt='2026-11-04T08:30:00Z';
 f.job.payload.sources=[{...f.previous.sources[0],id:'same-content-different-id',url:'https://present.example.org/story?at_campaign=rss',retrievedAt:'2026-11-04T09:55:00Z'}];
 assert.equal((await f.run()).id,f.previous.id);assert.deepEqual(f.counts(),{archiveReads:0,articleReads:0,assessments:0});
});

for(const scenario of ['newer queued job','newer source capture','newer publication','different URL','additional account','older method'] as const){
 test(`${scenario} stays on the evidence refresh path`,async()=>{
  const f=setup();
  if(scenario==='newer queued job')f.job.created_at='2026-11-04T13:00:00Z';
  if(scenario==='newer source capture')f.feed.retrievedAt='2026-11-04T13:00:00Z';
  if(scenario==='newer publication')f.feed.publishedAt='2026-11-04T13:00:00Z';
  if(scenario==='different URL')f.feed.url='https://present.example.org/another-report';
  if(scenario==='additional account')f.job.payload.sources=[f.feed,{...f.feed,id:'other-source',url:'https://other.example.org/report'}];
  else f.job.payload.sources=[f.feed];
  if(scenario==='older method')f.previous.research!.version='retired-research-method';
  const result=await f.run();
  assert.equal(f.counts().articleReads,1);assert.equal(f.counts().assessments,1);
  assert.notEqual(result.id,f.previous.id);assert.match(result.sources[0].summary,/materially new documented/);
  assert.equal(f.published.length,1);assert.ok(!f.calls.some(c=>c.name==='tether_reuse_job'));
 });
}

for(const flag of ['forceReassessment','refreshSources','gapCluster','canonExpansionWeek','canonCheck','depth'] as const){
 test(`deliberate ${flag} work is not consumed by stale feed reuse`,async()=>{
  const f=setup();f.job.payload[flag]=flag==='depth'?2:flag==='gapCluster'?'test-gap':flag==='canonExpansionWeek'?'2026-11-02':true;
  await f.run();assert.equal(f.counts().articleReads,1);assert.equal(f.counts().assessments,1);assert.equal(f.published.length,1);
  assert.ok(!f.calls.some(c=>c.name==='tether_reuse_job'));
 });
}

test('a reader request cannot use the trusted feed shortcut',async()=>{
 const f=setup();f.job.owner_key='guest:reader';f.job.payload.input=f.previous.sources[0].url!;
 const result=await f.run();
 assert.notEqual(result.id,f.previous.id);assert.deepEqual(f.counts(),{articleReads:1,archiveReads:1,assessments:1});
 assert.equal(f.published.length,1);assert.ok(!f.calls.some(c=>c.name==='tether_reuse_job'));
});

test('failed reuse lease cannot silently finish the job or enter paid work',async()=>{
 const f=setup();f.store.rpc=async()=>false as never;
 await assert.rejects(f.run(),(error:unknown)=>(error as {code?:string}).code==='40001');
 assert.deepEqual(f.counts(),{archiveReads:0,articleReads:0,assessments:0});assert.equal(f.published.length,0);
});

test('an explicit reassessment from an older origin is not swallowed by the legacy obsolete-job guard',async()=>{
 const f=setup(),origin=structuredClone(f.previous);
 origin.id=randomUUID();origin.createdAt='2026-11-04T09:00:00Z';origin.research!.version='retired-research-method';
 f.job.payload.researchFrom=origin.id;f.job.payload.forceReassessment=true;
 f.store.analysis=async id=>id===origin.id?origin:f.previous;
 await f.run();
 assert.equal(f.counts().assessments,1);assert.equal(f.published.length,1);
 assert.ok(!f.calls.some(c=>c.name==='tether_reuse_job'));
});
