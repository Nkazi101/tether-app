import test from 'node:test';
import assert from 'node:assert/strict';
import {pairFixture} from './fixtures/pair';
import {narrativeContextFixture as fixture} from './fixtures/narrative-context';
import {validateFrame,validateNarrativeLens,type CurrentFrame,type NarrativeLens} from '../src/lib/narrative-comparison';
import {readableHistoricalCase,researchNarrative,frameFingerprint} from '../server/services/narrative-research';
import {narrativeSegments} from '../src/lib/narrative-terms';
import type {Store} from '../server/services/store';
import type {HistoricalCase} from '../src/lib/comparison';

test('a process can support context without being forced into an action-sequence match',()=>{
 const f=fixture();assert.equal(validateFrame(f.current,f.base.sources).eventKind,'structural-process');
 assert.equal(validateNarrativeLens(f.lens,f.current,[f.historical]).parallels[0].focus,'mechanism');
 const satire={...f.current,eventKind:'narrative-artifact',facts:f.current.facts.map(x=>({...x,tier:'satire'}))};
 assert.equal(validateFrame(satire,f.base.sources).facts[0].tier,'satire');
});
test('unread quotations, invented roles and dangling references cannot enter a current frame',()=>{
 const f=fixture();const bad=structuredClone(f.current);bad.facts[0].evidence[0].passage='A passage absent from the supplied account.';
 assert.throws(()=>validateFrame(bad,f.base.sources),/absent/);
 assert.throws(()=>validateFrame({...f.current,cast:[{...f.current.cast[0],figure:'prophet'}]},f.base.sources));
 assert.throws(()=>validateFrame({...f.current,stage:{...f.current.stage,factIds:['invented']}},f.base.sources),/reference/);
});
test('two distinct facts on each side, a real difference and an actual continuation are required',()=>{
 const f=fixture(),bad=structuredClone(f.lens);bad.parallels[0].correspondences.forEach(r=>r.thenFactIds=['b1']);
 assert.throws(()=>validateNarrativeLens(bad,f.current,[f.historical]),/two distinct/);
 assert.throws(()=>validateNarrativeLens({...f.lens,parallels:[{...f.lens.parallels[0],caseId:'not-retrieved'}]},f.current,[f.historical]),/retrieved/);
 const continued=structuredClone(f.lens);continued.parallels[0].continuation={historicalFactIds:['b2'],implication:'The same already matched action cannot be called what happened next.'};
 assert.throws(()=>validateNarrativeLens(continued,f.current,[f.historical]),/beyond/);
 assert.throws(()=>validateNarrativeLens({...f.lens,pattern:'History guarantees that the present will end in the same way.'},f.current,[f.historical]),/destiny/);
});
test('prose definitions preserve proper terms and avoid newspaper attribution and economic inflation',()=>{
 assert.deepEqual(narrativeSegments('The Trickster challenges the Ruler through Projection.').filter(x=>x.term).map(x=>x.term),['trickster','ruler','projection']);
 assert.equal(narrativeSegments('According to The Guardian, Inflation rose by 3.7 percent.').filter(x=>x.term).length,0);
 assert.equal(narrativeSegments('Compensation payments were awarded as damages.').filter(x=>x.term).length,0);
 assert.equal(narrativeSegments('A guardian guards a door; no role has been established.').filter(x=>x.term).length,0);
 assert.equal(narrativeSegments('Sorcerer’s Apprentice').find(x=>x.term)?.term,'apprentice');
});
async function run(approve:boolean){
 const f=fixture(),prompts:string[]=[];const replies=[f.current,f.lens,{approve,issues:approve?[]:['The central inference is unsupported.']},...(!approve?[{abstain:true,reason:'Cannot repair this central mismatch from the supplied sources.'}]:[])];
 const prior={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';
 try{
  const result=await researchNarrative({rpc:async()=>true} as unknown as Store,f.base,false,1,[f.historical],{disableWeb:true,fetch:(async(_url,init)=>{prompts.push(JSON.parse(String(init?.body)).messages[0].content);return Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]});}) as typeof fetch});return{result,prompts,f};
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:prior.key,ANALYSIS_MODEL_ENABLED:prior.enabled})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
}
test('source abstraction precedes history; source review gates publication and preserves the frozen frame',async()=>{
 const{result,prompts,f}=await run(true);assert.equal(prompts.length,3);assert.ok(!prompts[0].includes(f.historical.title));assert.ok(prompts[1].includes('FROZEN CURRENT:'));assert.equal(result.currentFrame?.evidenceFingerprint,frameFingerprint(result.sources));assert.ok(result.narrativeLens);assert.equal(result.pairedStory,null);assert.equal(result.research?.libraryCasesChecked,1);
 const rejected=await run(false);assert.equal(rejected.result.narrativeLens,undefined);assert.ok(rejected.result.currentFrame);assert.match(rejected.result.research!.note,/withheld/);
});

test('an incomplete hosted search still forms source pairs from real hits, including redirected pages',async()=>{
 const f=fixture();const {hash}=await import('../server/services/store');const title='Earlier delivery bargaining in 1942',caseId='context:'+hash(title).slice(0,24);
 const lens=structuredClone(f.lens);lens.parallels[0].caseId=caseId;
 const stages:string[]=[];const replies=[f.current,{candidates:[{title,sourceIndices:[0,1]}]},{record:f.historical.narrativeRecord,origins:f.historical.sources.map(s=>({sourceId:s.id,role:s.id==='archive1'?'original-analysis':'secondary',basisPassage:s.summary,note:'Synthetic source role for protocol testing only.'}))},{approve:true,issues:[]},lens,{approve:true,issues:[]}];
 const prior={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED,search:process.env.HISTORICAL_SEARCH_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';process.env.HISTORICAL_SEARCH_ENABLED='true';
 try{
  const result=await researchNarrative({rpc:async()=>true} as unknown as Store,f.base,false,1,[],{onCall:stage=>stages.push(stage),read:async url=>({...f.historical.sources.find(s=>s.url===url)!,url:url+'?redirected=1'}),fetch:(async(url,init)=>{
   const body=JSON.parse(String(init?.body));
   if(String(url).endsWith('/responses')){assert.equal(body.max_tool_calls,5);return Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[{type:'web_search_call',action:{type:'search',query:'earlier delivery bargaining primary records'},results:f.historical.sources.map(s=>({url:s.url,title:s.title}))}]});}
   const next=replies.shift();assert.ok(next,'No unbounded repair loop should occur');return Response.json({choices:[{message:{content:JSON.stringify(next)}}]});
  }) as typeof fetch});
  assert.ok(result.narrativeLens,result.research?.note);assert.equal(result.research?.sourcesRead,2);assert.equal(result.primary?.id,caseId);assert.ok(stages.includes('historical-source-plan'));assert.equal(replies.length,0);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:prior.key,ANALYSIS_MODEL_ENABLED:prior.enabled,HISTORICAL_SEARCH_ENABLED:prior.search})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('a shared label cannot replace the actor mapping and common pressure',()=>{
 const f=fixture(),bad=structuredClone(f.lens);bad.parallels[0].analogy=null;
 assert.throws(()=>validateNarrativeLens(bad,f.current,[f.historical],true),/explicit actor mapping/);
 const duplicate=structuredClone(f.lens);duplicate.parallels[0].analogy!.mapping[1].then=duplicate.parallels[0].analogy!.mapping[0].then;
 assert.throws(()=>validateNarrativeLens(duplicate,f.current,[f.historical],true),/two different actors/);
});
test('visible dynamics require the actor and two distinct rhetoric/conduct observations',()=>{
 const f=fixture(),d={dynamic:'inflation' as const,actors:['Workers'],target:null,observation:'The group claims exceptional authority for its own demands.',factIds:['b1','b2'],alternative:'Ordinary bargaining rhetoric could explain the language.'};
 assert.throws(()=>validateFrame({...f.current,dynamics:[d]},f.base.sources,true),/separate rhetoric/);
 assert.throws(()=>validateFrame({...f.current,dynamics:[{...d,test:{kind:'inflation',exceptionalIdentification:{text:'The same one observation is cited as identification.',factIds:['b1']},materialConstraint:{text:'The same one observation is cited as a constraint.',factIds:['b1']}},basis:{rhetoricFactIds:['b1'],conductFactIds:['b1'],relationship:'One observation cannot establish both parts of the inference.'}}]},f.base.sources,true),/two distinct/);
});
test('the reader gets only a sourced historical result; an absent ending is not invented',async()=>{
 const {historicalResult}=await import('../src/lib/reading-trajectory');const f=fixture();
 const comparison={...f.base,currentFrame:f.current,narrativeLens:f.lens,primary:f.historical};
 assert.equal(historicalResult(comparison),null);
 const next=structuredClone(comparison);next.primary.narrativeRecord!.outcome={status:'unresolved',summary:'The negotiations remained unresolved in the historical account.',factIds:['b3'],asOf:'1942'};
 assert.equal(historicalResult(next)?.status,'unresolved');assert.equal(historicalResult(next)?.text,next.primary.narrativeRecord!.outcome.summary);
 const {validateHistoricalRecord}=await import('../src/lib/narrative-comparison');next.primary.narrativeRecord!.outcome.factIds=['missing'];
 assert.throws(()=>validateHistoricalRecord(next.primary.narrativeRecord,next.primary.sources),/reference/);
});


test('a quotation cannot silently bridge two noncontiguous source excerpts',()=>{
 const f=fixture(),source={...f.currentSource,exactPassages:['Workers and Company negotiate over new deliveries.','The board published the final decision the following day.']};
 const frame=structuredClone(f.current);frame.facts[0].evidence[0].passage='new deliveries. The board published the final decision';
 assert.throws(()=>validateFrame(frame,[source]),/absent/);
});


test('unsupported optional dynamics are removed before history without discarding a factual comparison',async()=>{
 const f=fixture(),current=structuredClone(f.current),prompts:string[]=[];
 current.dynamics=[{dynamic:'inflation',actors:['Workers'],target:null,observation:'A proposed reading of exceptional group authority.',factIds:['b1','b2'],alternative:'The account may establish ordinary bargaining only.',basis:{rhetoricFactIds:['b1'],conductFactIds:['b2'],relationship:'The proposed exceptional authority would need to survive the material constraint.'},test:{kind:'inflation',exceptionalIdentification:{text:'An annotation needing a separate semantic check.',factIds:['b1']},materialConstraint:{text:'A separate material constraint.',factIds:['b2']}}}];
 const replies=[current,{keepRoles:[0],keepDynamics:[],keepStage:true,issues:['The evidence supports bargaining, not exceptional identification.']},f.lens,{approve:true,issues:[]}];
 const prior={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';
 try{
  const result=await researchNarrative({rpc:async()=>true} as unknown as Store,f.base,false,1,[f.historical],{disableWeb:true,fetch:(async(_url,init)=>{const prompt=JSON.parse(String(init?.body)).messages[0].content;prompts.push(prompt);return Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]});}) as typeof fetch});
  assert.ok(result.narrativeLens,result.research?.note);assert.equal(result.currentFrame?.dynamics.length,0);assert.equal(result.currentFrame?.annotationReview?.status,'checked');assert.ok(prompts[1].includes('before any history'));assert.ok(!prompts[1].includes(f.historical.title));assert.equal(replies.length,0);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:prior.key,ANALYSIS_MODEL_ENABLED:prior.enabled})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('a malformed optional discovery lead does not erase a separately qualified local candidate',async()=>{
 const f=fixture();const title='An optional earlier delivery dispute';
 const origins=f.historical.sources.map(s=>({sourceId:s.id,role:s.id==='archive1'?'original-analysis':'secondary',basisPassage:s.summary,note:'Synthetic source classification.'}));
 const replies=[f.current,{candidates:[{title,sourceIndices:[0,1]}]},{record:{version:99},origins},{record:{version:99},origins},f.lens,{approve:true,issues:[]}];
 const prior={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED,search:process.env.HISTORICAL_SEARCH_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';process.env.HISTORICAL_SEARCH_ENABLED='true';
 try{
  const result=await researchNarrative({rpc:async()=>true} as unknown as Store,f.base,false,1,[f.historical],{read:async url=>f.historical.sources.find(s=>s.url===url)!,fetch:(async(url)=>{
   if(String(url).endsWith('/responses'))return Response.json({status:'incomplete',output:[{type:'web_search_call',action:{type:'search',query:'historical delivery dispute'},results:f.historical.sources.map(s=>({url:s.url,title:s.title}))}]});
   assert.ok(replies.length,'No unbounded repair');return Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]});
  }) as typeof fetch});
  assert.ok(result.narrativeLens,result.research?.note);assert.equal(result.primary?.id,f.historical.id);assert.equal(result.research?.candidateChecks?.[0].status,'rejected');assert.match(result.research!.candidateChecks![0].reason,/encoding could not complete/);assert.equal(replies.length,0);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:prior.key,ANALYSIS_MODEL_ENABLED:prior.enabled,HISTORICAL_SEARCH_ENABLED:prior.search})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('qualified public history survives even when it does not illuminate the current event',async()=>{
 const f=fixture(),rows:any[]=[];const title='A source-qualified earlier delivery dispute';
 const origins=f.historical.sources.map(s=>({sourceId:s.id,role:s.id==='archive1'?'original-analysis':'secondary',basisPassage:s.summary,note:'Synthetic source classification.'}));
 const replies=[f.current,{candidates:[{title,sourceIndices:[0,1]}]},{record:f.historical.narrativeRecord,origins},{approve:true,issues:[]},{abstain:true,reason:'The historical constraints differ materially; this case should not be shown as a parallel.'}];
 const prior={key:process.env.MUSE_API_KEY,enabled:process.env.ANALYSIS_MODEL_ENABLED,search:process.env.HISTORICAL_SEARCH_ENABLED};process.env.MUSE_API_KEY='test-only';process.env.ANALYSIS_MODEL_ENABLED='true';process.env.HISTORICAL_SEARCH_ENABLED='true';
 try{
  const store={rpc:async()=>true,db:{from:(table:string)=>{assert.equal(table,'tether_case_versions');return{insert:async(row:any)=>{rows.push(row);return{error:null};}};}}} as unknown as Store;
  const result=await researchNarrative(store,f.base,true,1,[],{read:async url=>f.historical.sources.find(s=>s.url===url)!,fetch:(async(url)=>{
   if(String(url).endsWith('/responses'))return Response.json({status:'incomplete',output:[{type:'web_search_call',action:{type:'search',query:'earlier delivery dispute original history'},results:f.historical.sources.map(s=>({url:s.url,title:s.title}))}]});
   assert.ok(replies.length,'No unbounded repair');return Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]});
  }) as typeof fetch});
  assert.equal(result.narrativeLens,undefined);assert.equal(rows.length,1);assert.ok(rows[0].payload.historicalCase.narrativeRecord);assert.equal(rows[0].payload.historicalCase.review,'web-researched');assert.equal(replies.length,0);
 }finally{for(const[k,v]of Object.entries({MUSE_API_KEY:prior.key,ANALYSIS_MODEL_ENABLED:prior.enabled,HISTORICAL_SEARCH_ENABLED:prior.search})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('source-only review can correct an overrestrictive origin label without inventing credentials',async()=>{
 const {encodeHistoricalRecord}=await import('../server/services/narrative-research');const f=fixture(),historical=structuredClone(f.historical);
 const credit='Historical account by Dr Inez Sample';historical.sources[0].summary=credit+'. '+historical.sources[0].summary;
 const origins=historical.sources.map(s=>({sourceId:s.id,role:'secondary',basisPassage:null,note:'Initial triage did not identify an original investigation.'}));
 const corrected=origins.map((o,i)=>i?o:{...o,role:'scholarly-history',basisPassage:credit,note:'The supplied account is credited historical scholarship; novel archival discovery is not a prerequisite.'});
 const replies=[{record:historical.narrativeRecord,origins},{approve:true,issues:[],origins:corrected}];
 const prior=process.env.MUSE_API_KEY;process.env.MUSE_API_KEY='test-only';
 try{const result=await encodeHistoricalRecord({rpc:async()=>true} as unknown as Store,historical,{fetch:(async()=>Response.json({choices:[{message:{content:JSON.stringify(replies.shift())}}]})) as typeof fetch});assert.ok(result);assert.equal(result.sources[0].historicalProvenance?.role,'scholarly-history');assert.equal(replies.length,0);}
 finally{if(prior===undefined)delete process.env.MUSE_API_KEY;else process.env.MUSE_API_KEY=prior;}
});
