import {researchSchema} from "../src/lib/comparison";
import test from 'node:test';import assert from 'node:assert/strict';
import {modelTerms,narrativeAnnotationSchema,NARRATIVE_MODEL_VERSION} from '../src/lib/narrative-model';
import {validateEpisode} from '../src/lib/episodes';
import {pairFixture} from './fixtures/pair';
import {canonicalCases} from '../server/domain/canon';
import {corpusCoverage,eraFor,regionsFor} from '../src/lib/corpus-coverage';
import {retrieveHistoricalCandidates,diversityAudit} from '../server/domain/retrieval-channels';
import {researchGap,weekKey} from '../server/services/canon-maintenance';
import {canonCheckDue,runCanonCheck} from '../server/services/canon-verification';
import type {Store} from '../server/services/store';
import {ResearchDeferred} from '../server/domain/research-deferred';

test('fixed narrative vocabulary rejects invented roles and needs evidence and a competing reading',()=>{
 assert.equal(new Set(modelTerms.map(t=>t.id)).size,modelTerms.length);
 assert.throws(()=>narrativeAnnotationSchema.parse({version:NARRATIVE_MODEL_VERSION,roles:[{actorId:'a',figure:'Visionary',observation:{text:'A sufficiently long observation',anchorIds:['a']}}],dynamics:[],arc:null}));
 const f=pairFixture();const symbolic={version:NARRATIVE_MODEL_VERSION,roles:[{actorId:'not-a-real-actor',figure:'hero' as const,basis:'reading' as const,observation:{text:'The source describes a challenge.',anchorIds:['a']},alternative:'An ordinary disagreement may explain this.'}],dynamics:[],arc:null};
 assert.throws(()=>validateEpisode({...f.now,symbolic},f.base.sources),/named episode actor/);
 symbolic.roles[0].actorId=f.now.actors[0].id;symbolic.roles[0].observation.anchorIds=['absent'];
 assert.throws(()=>validateEpisode({...f.now,symbolic},f.base.sources),/unresolved evidence/);
 symbolic.roles[0].observation.anchorIds=[f.now.anchors[0].id];symbolic.roles[0].observation.text='This proves the collective is destined for collapse.';
 assert.throws(()=>validateEpisode({...f.now,symbolic},f.base.sources),/diagnose hidden motives/);
});
test('coverage grid preserves unknown dynamics and empty geographic groups',()=>{
 const coverage=corpusCoverage(canonicalCases);assert.equal(coverage.entries.length,14);assert.equal(coverage.unclassifiedDynamics,14);
 assert.equal(eraFor(-415),'ancient');assert.equal(eraFor(null),'unknown');
 assert.ok(!coverage.entries.some(c=>c.regions.includes('africa')),'The current corpus must not imply African coverage it does not have.');
 assert.deepEqual(regionsFor({...canonicalCases[0],curation:undefined}),['unknown']);
});
test('symbolic retrieval is a lead channel and does not bypass structural publication gates',()=>{
 const f=pairFixture();const result=retrieveHistoricalCandidates(f.now,canonicalCases);
 assert.ok(result.candidates.length<=80);assert.equal(result.channels.symbolic,0);assert.equal(result.examined,14);
 assert.equal(diversityAudit([canonicalCases[0]]).status,'not-established');
 assert.equal(diversityAudit([{...canonicalCases[0],curation:undefined},canonicalCases[1]]).status,'not-established','Unknown origin must not count as a distant culture.');
 const query=structuredClone(f.now);query.actors.forEach((a,i)=>{a.name='Renamed '+i;a.aliases=[];});
 assert.deepEqual(retrieveHistoricalCandidates(query,canonicalCases).candidates.map(c=>c.id),result.candidates.map(c=>c.id));
});
test('gap clusters use source-independent relationship structure and exclude capacity waits',()=>{
 const f=pairFixture();const c={...f.base,currentEpisode:f.now,research:researchSchema.parse({version:'episode-research-8',id:f.base.id,status:'limited' as const,depth:1,searchedAt:new Date().toISOString(),queries:[],sourcesLocated:0,sourcesRead:0,candidatesConsidered:[],model:'test',note:'A bounded search did not establish a case.',eventApplicability:'eligible' as const,diagnostic:{code:'no-structural-match' as const,stage:'ranking'}})};
 const a=researchGap(c)!;assert.ok(a);const renamed=structuredClone(c);renamed.currentEpisode!.actors.forEach(a=>{a.name='Changed name';});assert.equal(researchGap(renamed)!.cluster,a.cluster);
 assert.equal(researchGap({...c,research:{...c.research,diagnostic:{code:'capacity',stage:'discovery'}}}),null);
 assert.equal(weekKey(new Date('2026-11-08T23:59:00Z')),'2026-11-02');assert.equal(weekKey(new Date('2026-11-09T00:00:00Z')),'2026-11-09');
});
test('quarterly source rechecks use capture time, not historical event age',()=>{
 const c=canonicalCases[0];assert.equal(canonCheckDue(c,new Date('2026-11-04')),false);assert.equal(canonCheckDue(c,new Date('2027-04-01')),true);
});
test('canon verification refuses reader-owned jobs before touching data',async()=>{
 await assert.rejects(()=>runCanonCheck({} as Store,{owner_key:'guest:example',payload:{canonCheck:'test'}} as never),/Invalid canon-check owner/);
});
test('a canon check publishes only after fresh retrieval and a separate source check; capacity preserves its queue',async()=>{
 const f=pairFixture(),c={...canonicalCases[0],id:'qa-case',version:'old',episode:f.past,sources:f.historical,review:'web-researched' as const};
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];let allow=true;let taskStatus='queued';
 const store={cases:async()=>[c],db:{from:()=>{const query:any={select:()=>query,eq:()=>query,order:()=>query,range:async()=>({data:[],error:null}),single:async()=>({data:{id:'task',status:taskStatus,case_id:c.id,case_version:c.version},error:null})};return query;}},rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return name==='tether_reserve_model'?allow:true;}} as unknown as Store;
 const env=process.env.MUSE_API_KEY;process.env.MUSE_API_KEY='test-only';const enabled=process.env.ANALYSIS_MODEL_ENABLED;process.env.ANALYSIS_MODEL_ENABLED='true';
 try{
  let count=0;const deps={read:async(url:string)=>f.historical.find(s=>s.url===url)!,fetch:(async()=>Response.json({choices:[{message:{content:JSON.stringify(++count===1?{episode:f.past}:{episodes:[f.past],issues:[]})}}]})) as typeof fetch};
  const job={id:'job',lease_token:'lease',owner_key:'system:canon',payload:{canonCheck:'qa'}} as never;
  await runCanonCheck(store,job,deps);assert.equal(count,2);
  const completed=calls.find(c=>c.name==='tether_complete_canon_check');assert.equal(completed?.args.p_status,'passed');assert.equal((completed?.args.p_publication as any).historicalCase.id,c.id);
  taskStatus='passed';await runCanonCheck(store,job,deps);assert.equal(count,2,'A retry after publication must not pay for another encoding.');taskStatus='queued';
  calls.length=0;allow=false;await assert.rejects(()=>runCanonCheck(store,job,deps),ResearchDeferred);assert.ok(!calls.some(c=>c.name==='tether_complete_canon_check'));
 }finally{if(env===undefined)delete process.env.MUSE_API_KEY;else process.env.MUSE_API_KEY=env;if(enabled===undefined)delete process.env.ANALYSIS_MODEL_ENABLED;else process.env.ANALYSIS_MODEL_ENABLED=enabled;}
});

test('geographic coverage retains multiple regions without country substring false positives',()=>{
 const c=canonicalCases[0];const withRegions=(regions:string[])=>({...c,curation:{...c.curation!,regions}});
 assert.deepEqual(regionsFor(withRegions(['Nigeria'])),['africa']);
 assert.deepEqual(regionsFor(withRegions(['Malaysia'])),['east-asia']);
 assert.deepEqual(regionsFor(withRegions(['Indiana, United States'])),['americas']);
 assert.deepEqual(regionsFor(withRegions(['France, Egypt and the UK'])),['europe','west-asia']);
 assert.deepEqual(regionsFor(withRegions(['North Africa'])),['west-asia']);
});
