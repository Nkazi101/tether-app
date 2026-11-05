import test from 'node:test';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';
import {compileHistoricalReuseProfile,getHistoricalReuseProfile}from'../server/services/historical-reuse';
import {narrativeContextFixture}from'./fixtures/narrative-context';
import type{Store}from'../server/services/store';import type{HistoricalCase,NewsTopic}from'../src/lib/comparison';
function head(topic:NewsTopic='science'){return{id:randomUUID(),latest_analysis_id:randomUUID(),topic,is_public:true,is_walkthrough:false,has_aligned_pair:false};}
function row(h:ReturnType<typeof head>,c:HistoricalCase|null=narrativeContextFixture().historical,ordered=false){
 const r:Record<string,unknown>={id:h.latest_analysis_id,situation_id:h.id,caseId:c?.id||null,caseTitle:c?.title||null,casePeriod:c?.period||null,narrativeVersion:c&&!ordered?'1':null,orderedVersion:c&&ordered?'1':null,narrativeStart:c?.narrativeRecord?.startYear??null,narrativeEnd:c?.narrativeRecord?.endYear??null,orderedStart:c?.episode?.startYear??null,orderedEnd:c?.episode?.endYear??null,anchors:c?.episode?.anchors||null};
 c?.sources.forEach((s,i)=>{r[`source${i}Id`]=s.id;r[`source${i}Url`]=s.url;});c?.narrativeRecord?.facts.forEach((f,i)=>{r[`fact${i}`]=f.evidence;});return r;
}
test('reuse counts distinct current situations across domains, including pre-policy lenses and aliases',()=>{
 const f=narrativeContextFixture(),alias=structuredClone(f.historical);alias.id='alias:different-title';alias.title='A renamed account of the same bounded episode';
 const a=head('science'),b=head('technology'),c=head('science'),d=head('culture'),report=head('world');
 const other=structuredClone(f.historical);other.id='another-event';other.narrativeRecord!.startYear=1950;other.narrativeRecord!.endYear=1950;
 const profile=compileHistoricalReuseProfile([a,b,c,d,report],[row(a),row(b,alias),row(c),row(d,other),row(report,null)]);
 assert.equal(profile.headsWithHistoricalReading,4);assert.equal(profile.entries.length,2);assert.equal(profile.topRepeated[0].count,3);assert.equal(profile.topRepeated[0].situationCount,3);assert.deepEqual(profile.topRepeated[0].domains,['science','technology']);assert.equal(profile.countFor(alias),3);assert.equal(profile.countFor(f.historical),3);assert.equal(profile.countFor(other),1);assert.equal(profile.incomplete,false);
 assert.equal(profile.topRepeated[0].caseIds.length,2);assert.equal(a.has_aligned_pair,false,'Demoted/pre-policy exposure is deliberately still counted');
});
test('missing rows, foreign analysis ownership and bounded alias projections are exposed as incomplete',()=>{
 const a=head(),missing=head(),foreign=head(),clipped=head();const foreignRow=row(foreign);foreignRow.situation_id=randomUUID();const clippedRow=row(clipped);clippedRow.source8Id='a-ninth-source';clippedRow.source8Url='https://extra.example/archive';
 const profile=compileHistoricalReuseProfile([a,missing,foreign,clipped],[row(a),foreignRow,clippedRow],{truncated:true});
 assert.equal(profile.headsWithHistoricalReading,2);assert.equal(profile.missingAnalyses,1);assert.equal(profile.invalidRows,1);assert.equal(profile.aliasProjectionIncomplete,1);assert.equal(profile.truncated,true);assert.equal(profile.incomplete,true);assert.equal(profile.countFor(narrativeContextFixture().historical),2);
});
function fakeStore(heads:Array<Record<string,any>>,rows:Array<Record<string,unknown>>,options:{failOnce?:boolean}={}){
 const selections:string[]=[],requested:string[][]=[];let loads=0,failed=false;
 const store={db:{from(table:string){let keys:string[]=[];const filters:Record<string,unknown>={};let bound=Infinity;const query={
  select:(fields:string)=>{selections.push(fields);return query;},eq:(k:string,v:unknown)=>{filters[k]=v;return query;},not:(k:string,_op:string,v:unknown)=>{filters['not:'+k]=v;return query;},order:()=>query,limit:(n:number)=>{bound=n;return query;},in:(_k:string,ids:string[])=>{keys=ids;requested.push(ids);return query;},
  then(resolve:(r:unknown)=>void){if(table==='tether_situations'){loads++;if(options.failOnce&&!failed){failed=true;resolve({data:null,error:new Error('A temporary database failure')});return;}resolve({data:heads.filter(h=>Object.entries(filters).every(([k,v])=>k.startsWith('not:')?h[k.slice(4)]!==v:h[k]===v)).slice(0,bound),error:null});}else resolve({data:rows.filter(r=>keys.includes(String(r.id))),error:null});},
 };return query;}}}as unknown as Store;return{store,selections,requested,get loads(){return loads;}};
}
test('loads coalesce per Store, exclude private/example heads and avoid historical source bodies',async()=>{
 const publicHead=head('science'),privateHead={...head('technology'),is_public:false},example={...head('culture'),is_walkthrough:true};
 const a=fakeStore([publicHead,privateHead,example],[row(publicHead),row(privateHead),row(example)]);
 const first=getHistoricalReuseProfile(a.store),second=getHistoricalReuseProfile(a.store);assert.equal(first,second);
 const profile=await first;assert.equal(profile.headsScanned,1);assert.equal(profile.headsWithHistoricalReading,1);assert.equal(a.loads,1);assert.equal(await getHistoricalReuseProfile(a.store),profile);assert.equal(a.loads,1);
 assert.deepEqual(a.requested.flat(),[publicHead.latest_analysis_id]);assert.ok(a.selections.every(s=>!/(?:^|,)payload(?:,|$)|->>?(?:summary|readSegments|exactPassages)\b|(?:^|,)primary:payload->primary(?:,|$)/.test(s)),'Reuse measurement does not download article or archive bodies');
 const other=fakeStore([publicHead],[row(publicHead)]);assert.notEqual(await getHistoricalReuseProfile(other.store),profile);assert.equal(other.loads,1,'Another Store/project gets its own snapshot');
});
test('bounded scans and batches report truncation; a failed load cannot become a cached empty census',async()=>{
 const heads=Array.from({length:501},()=>head()),rows=heads.map(h=>row(h,null));
 const a=fakeStore(heads,rows);const profile=await getHistoricalReuseProfile(a.store);assert.equal(profile.headsScanned,500);assert.equal(profile.truncated,true);assert.equal(profile.incomplete,true);assert.equal(a.requested.length,10);assert.ok(a.requested.every(ids=>ids.length<=50));
 const one=head(),b=fakeStore([one],[row(one)],{failOnce:true});await assert.rejects(getHistoricalReuseProfile(b.store),/temporary database failure/);assert.equal((await getHistoricalReuseProfile(b.store)).headsWithHistoricalReading,1);assert.equal(b.loads,2);
});

test('successful snapshots expire and rebinding a Store to another database cannot reuse its profile',async()=>{
 const originalNow=Date.now;let clock=100000;Date.now=()=>clock;
 try{
  const h=head(),a=fakeStore([h],[row(h)]),first=await getHistoricalReuseProfile(a.store);
  clock+=29999;assert.equal(await getHistoricalReuseProfile(a.store),first);assert.equal(a.loads,1);
  clock+=2;assert.notEqual(await getHistoricalReuseProfile(a.store),first);assert.equal(a.loads,2);
  const other=fakeStore([],[]);a.store.db=other.store.db;const rebound=await getHistoricalReuseProfile(a.store);assert.equal(rebound.headsScanned,0);assert.equal(other.loads,1);
 }finally{Date.now=originalNow;}
});
