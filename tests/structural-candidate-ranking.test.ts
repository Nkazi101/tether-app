import test from 'node:test';import assert from 'node:assert/strict';
import {rankContextCandidates,type RankingChat,type StructuralCandidateMatch}from'../server/domain/structural-candidate-ranking';
import {narrativeContextFixture}from'./fixtures/narrative-context';
import type{HistoricalCase}from'../src/lib/comparison';

function fixture(count=12){
 const f=narrativeContextFixture(),cases=Array.from({length:count},(_,i)=>{
  const c=structuredClone(f.historical),year=1850+i;c.id=`candidate:${i+1}`;c.title=`Synthetic district ${i+1} delivery dispute`;c.period=String(year);c.episode=null;
  c.narrativeRecord!.startYear=year;c.narrativeRecord!.endYear=year;
  const sourceIds=new Map(c.sources.map((source,j)=>[source.id,`synthetic:${i+1}:source:${j+1}`]));
  for(const fact of c.narrativeRecord!.facts){fact.text=fact.text.replace(/\.$/,'')+` in district ${i+1} during ${year}.`;fact.evidence=fact.evidence.map(e=>({sourceId:sourceIds.get(e.sourceId)!,passage:fact.text}));}
  c.sources=c.sources.map((source,j)=>({...source,id:sourceIds.get(source.id)!,url:`https://archive${j+1}.example/dispute-${i+1}`,summary:c.narrativeRecord!.facts.map(f=>f.text).join(' ')}));
  return c;
 });return{...f,cases};
}
const match=(caseId:string):StructuralCandidateMatch=>({caseId,nowFactIds:['b1','b2'],thenFactIds:['b1','b2'],relationship:'The workers control deliveries the employer needs, and withholding that input creates pressure to negotiate.',limit:'The earlier group had recognised negotiating authority that the present account does not establish.'});
const packetsFrom=(prompt:string)=>JSON.parse(prompt.slice(prompt.indexOf('SOURCE-ENCODED HISTORICAL CASES:')+'SOURCE-ENCODED HISTORICAL CASES:'.length));

test('structural ranking can retrieve a supplied case beyond the former tag top eight without rewriting current evidence',async()=>{
 const f=fixture(),before=structuredClone({current:f.current,cases:f.cases}),calls:Array<{prompt:string;max:number;stage:string}>=[];
 const target=f.cases[10];
 const result=await rankContextCandidates(f.current,f.cases,async(prompt,max,stage)=>{calls.push({prompt,max,stage});const packets=packetsFrom(prompt);assert.equal(packets.length,12);assert.ok(packets.some((p:any)=>p.id===target.id));return{matches:[match(target.id),match(f.cases[1].id)]};},{headline:f.base.title});
 assert.deepEqual(result.candidates.map(c=>c.id),[target.id,f.cases[1].id]);assert.equal(result.candidates[0],target);assert.equal(result.eligible,12);assert.equal(result.examined,12);assert.equal(result.truncated,false);assert.equal(result.usedModel,true);assert.equal(calls.length,1);assert.equal(calls[0].stage,'structural-candidate-ranking');assert.ok(calls[0].max<=6000);
 assert.deepEqual({current:f.current,cases:f.cases},before,'Ranking must preserve the already source-anchored frame and candidate records');
 const currentJson=calls[0].prompt.split('FROZEN CURRENT:')[1].split('\n SOURCE-ENCODED HISTORICAL CASES:')[0];assert.deepEqual(JSON.parse(currentJson),f.current);
});
test('invalid candidate identities, unknown references and duplicate candidate IDs cannot enter the selected pool',async()=>{
 const f=fixture(4),good=match(f.cases[1].id);
 const result=await rankContextCandidates(f.current,f.cases,async()=>({matches:[match('not-in-the-pool'),good,{...good},{...match(f.cases[2].id),nowFactIds:['b1','invented-current']},{...match(f.cases[3].id),thenFactIds:['b1','invented-past']}]}),{headline:f.base.title});
 assert.deepEqual(result.candidates.map(c=>c.id),[f.cases[1].id]);assert.equal(result.invalid,4);assert.equal(result.matches.length,1);
});
test('two distinct facts on both sides are necessary; invalid-only output is an execution error rather than an empty historical finding',async()=>{
 const f=fixture(2);let calls=0;
 for(const bad of [{...match(f.cases[0].id),nowFactIds:['b1','b1']},{...match(f.cases[0].id),thenFactIds:['b2','b2']},match('invented-case')]){
  await assert.rejects(rankContextCandidates(f.current,f.cases,async()=>{calls++;return{matches:[bad]};},{headline:f.base.title}),/provider-invalid-structural-ranking-references/);
 }
 assert.equal(calls,3,'Each bounded attempt makes one ranking call, with no internal approval loop');
});
test('a genuine abstention remains empty and does not fall back to the first tagged candidates',async()=>{
 const f=fixture();const result=await rankContextCandidates(f.current,f.cases,async()=>({matches:[]}),{headline:f.base.title});
 assert.deepEqual(result.candidates,[]);assert.deepEqual(result.matches,[]);assert.equal(result.usedModel,true);assert.equal(result.invalid,0);assert.equal(result.examined,12);
});
test('empty or singleton encoded pools avoid unnecessary model requests',async()=>{
 const f=fixture(1);const noCall:RankingChat=async()=>{throw new Error('A paid ranking call was unnecessary');};
 const empty=await rankContextCandidates(f.current,[],noCall,{headline:f.base.title});assert.equal(empty.usedModel,false);assert.deepEqual(empty.candidates,[]);
 const single=await rankContextCandidates(f.current,f.cases,noCall,{headline:f.base.title});assert.equal(single.usedModel,false);assert.deepEqual(single.candidates,[f.cases[0]]);
 const noRecord={...f.cases[0],id:'not-encoded',narrativeRecord:undefined};const duplicate={...f.cases[0]};
 const filtered=await rankContextCandidates(f.current,[f.cases[0],noRecord,duplicate],noCall,{headline:f.base.title});assert.equal(filtered.eligible,1);assert.equal(filtered.examined,1);
});
test('the pool cap reports actual examination and cannot accept an unseen case beyond the bound',async()=>{
 const f=fixture(85);let examined=0;
 const bounded=await rankContextCandidates(f.current,f.cases,async prompt=>{examined=packetsFrom(prompt).length;return{matches:[match(f.cases[79].id)]};},{headline:f.base.title,poolLimit:1000});
 assert.equal(examined,80);assert.equal(bounded.eligible,85);assert.equal(bounded.examined,80);assert.equal(bounded.truncated,true);assert.equal(bounded.candidates[0].id,f.cases[79].id);
 await assert.rejects(rankContextCandidates(f.current,f.cases,async()=>({matches:[match(f.cases[80].id)]}),{headline:f.base.title,poolLimit:80}),/provider-invalid-structural-ranking-references/);
 const smaller=await rankContextCandidates(f.current,f.cases,async()=>({matches:[]}),{headline:f.base.title,poolLimit:5});assert.equal(smaller.examined,5);assert.equal(smaller.truncated,true);
});
test('reuse counts inform the supplied evidence but do not automatically ban a strong repeated case',async()=>{
 const f=fixture(3),target=f.cases[1];let seenUses=0;
 const result=await rankContextCandidates(f.current,f.cases,async prompt=>{seenUses=packetsFrom(prompt).find((p:any)=>p.id===target.id).recentPublicUses;return{matches:[match(target.id)]};},{headline:f.base.title,reuseCount:c=>c.id===target.id?19:0});
 assert.equal(seenUses,19);assert.deepEqual(result.candidates.map(c=>c.id),[target.id]);
});
test('malformed responses and provider/capacity failures cannot silently become a historical no-match',async()=>{
 const f=fixture(2);
 for(const raw of [null,{},'not JSON',{matches:[{...match(f.cases[0].id),relationship:'Too generic'}]},{matches:[{...match(f.cases[0].id),nowFactIds:['b1']}]}])await assert.rejects(rankContextCandidates(f.current,f.cases,async()=>raw,{headline:f.base.title}),/provider-invalid-structural-ranking/);
 const unavailable=new Error('capacity');let calls=0;
 await assert.rejects(rankContextCandidates(f.current,f.cases,async()=>{calls++;throw unavailable;},{headline:f.base.title}),error=>error===unavailable);assert.equal(calls,1);
});
test('selection output is bounded and includes the directed hypothesis and its limitation for downstream checking',async()=>{
 const f=fixture(4),selected=match(f.cases[2].id);
 const result=await rankContextCandidates(f.current,f.cases,async()=>({matches:[selected]}),{headline:f.base.title,limit:1});assert.deepEqual(result.matches,[selected]);assert.equal(result.candidates.length,1);
 await assert.rejects(rankContextCandidates(f.current,f.cases,async()=>({matches:[selected,match(f.cases[1].id)]}),{headline:f.base.title,limit:1}),/provider-invalid-structural-ranking/);
});


test('proven aliases collapse before the model and preserve the first qualified case in retrieval order',async()=>{
 const f=fixture(2),first=f.cases[0],sameId={...structuredClone(first),version:'a-later-listed-version',title:'Same identifier, later-listed version'},alias=structuredClone(first);alias.id='renamed:the-same-episode';alias.title='A different title for the same earlier episode';alias.sources.forEach(source=>{source.url=source.url!.replace('https://','https://www.')+'?utm_source=feed';});
 const ordered=[first,sameId,alias,f.cases[1]],before=structuredClone(ordered);let supplied:string[]=[];
 const result=await rankContextCandidates(f.current,ordered,async prompt=>{const packets=packetsFrom(prompt);supplied=packets.map((p:any)=>p.id);assert.equal(packets[0].title,first.title);return{matches:[match(first.id),match(f.cases[1].id)]};},{headline:f.base.title});
 assert.deepEqual(supplied,[first.id,f.cases[1].id]);assert.equal(result.aliasesCollapsed,2);assert.equal(result.eligible,2);assert.equal(result.examined,2);assert.equal(result.candidates[0],first);assert.deepEqual(ordered,before);
 await assert.rejects(rankContextCandidates(f.current,ordered,async()=>({matches:[match(alias.id)]}),{headline:f.base.title}),/provider-invalid-structural-ranking-references/,'A collapsed alias was not supplied as an independent candidate');
});
test('a shared broad reference page does not collapse independently evidenced episodes with the same dates',async()=>{
 const f=fixture(2);f.cases[1].narrativeRecord!.startYear=f.cases[0].narrativeRecord!.startYear;f.cases[1].narrativeRecord!.endYear=f.cases[0].narrativeRecord!.endYear;
 f.cases[1].sources.forEach((source,i)=>{source.url=f.cases[0].sources[i].url;});
 const result=await rankContextCandidates(f.current,f.cases,async()=>({matches:f.cases.map(c=>match(c.id))}),{headline:f.base.title});
 assert.equal(result.aliasesCollapsed,0);assert.equal(result.eligible,2);assert.equal(result.candidates.length,2);
});
