import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID}from'node:crypto';
import {CROSS_CONTEXT_POLICY,MIN_HISTORICAL_DISTANCE_YEARS,currentEventYear,actorNameKey,sharedNamedPrincipals,crossContextProblem}from'../src/lib/cross-context';
import {hasHistoricalReading}from'../src/lib/reading-trajectory';
import {researchSchema,type Comparison}from'../src/lib/comparison';
import {validateFrame,validateHistoricalRecord,validateNarrativeLens}from'../src/lib/narrative-comparison';
import {pairedStorySchema}from'../src/lib/paired-story';
import {matchEpisodes}from'../server/domain/structure-match';
import {narrativeContextFixture}from'./fixtures/narrative-context';

type Fixture=ReturnType<typeof narrativeContextFixture>;
function reading(f:Fixture,policy=false):Comparison{
 return{...f.base,currentFrame:f.current,narrativeLens:f.lens,primary:f.historical,alternatives:[],research:policy?researchSchema.parse({version:'narrative-research-11',comparisonPolicy:CROSS_CONTEXT_POLICY,id:randomUUID(),status:'searched',depth:1,searchedAt:'2026-11-01T00:00:00Z',queries:[],sourcesLocated:0,sourcesRead:0,candidatesConsidered:[],model:'Synthetic protocol fixture',note:'Synthetic policy test, not historical accuracy evidence.'}):null};
}
function sharedPrincipal(f:Fixture,name='Kim Kardashian'){
 // Synthetic added passages keep the mechanics source-anchored; this is an
 // identity-guard fixture, not a statement about this real person's history.
 const currentText=`${name} represents the workers in this current bargaining episode.`,pastText=`${name} represented the workers during the earlier bargaining episode.`;
 f.base.sources[0].summary+=' '+currentText;
 f.current.facts.push({id:'named-now',text:currentText,tier:'reported',evidence:[{sourceId:f.base.sources[0].id,passage:currentText}]});
 f.current.cast.push({actor:name,figure:'challenger',basis:'functional',observation:'The named representative acts for the workers in this episode.',factIds:['named-now'],qualification:'A role in this episode does not establish a permanent personal quality.'});
 f.historical.sources[0].summary+=' '+pastText;
 f.historical.narrativeRecord!.facts.push({id:'named-then',text:pastText,tier:'historical-record',evidence:[{sourceId:f.historical.sources[0].id,passage:pastText}]});
 validateFrame(f.current,f.base.sources);validateHistoricalRecord(f.historical.narrativeRecord,f.historical.sources);
}
function publicInstitution(f:Fixture){
 const p=f.lens.parallels[0];p.analogy!.mapping[1].now='National Assembly';p.analogy!.mapping[1].then='National Assembly';
 Object.assign(p.crossContext!.actorChecks[1],{now:'National Assembly',then:'National Assembly',nowKind:'public-institution',thenKind:'public-institution',relationship:'shared-public-institution',explanation:'The constitutional institution persists, but its officeholders and the documented bargaining episodes are distinct.'});
 p.crossContext!.episodeSeparation='These are different disputes separated by generations, with different workers and different elected officeholders.';
 return p;
}
test('the explicit product boundary rejects a 24-year gap and accepts 25 years',()=>{
 const f=narrativeContextFixture(),p=f.lens.parallels[0];assert.equal(MIN_HISTORICAL_DISTANCE_YEARS,25);
 f.historical.narrativeRecord!.endYear=2002;assert.match(crossContextProblem(p,f.current,f.historical,2026)!,/at least 25/);assert.equal(hasHistoricalReading(reading(f,true)),false);
 f.historical.narrativeRecord!.endYear=2001;assert.equal(crossContextProblem(p,f.current,f.historical,2026),null);assert.equal(hasHistoricalReading(reading(f,true)),true);
});
test('the full documented historical end controls distance, not an attractive early start or display period',()=>{
 const f=narrativeContextFixture();f.historical.period='1850';f.historical.narrativeRecord!.startYear=1850;f.historical.narrativeRecord!.endYear=2002;
 assert.match(crossContextProblem(f.lens.parallels[0],f.current,f.historical,2026)!,/recent context/);
 assert.equal(hasHistoricalReading(reading(f)),false);
});
test('current-event dating uses the reported account and does not silently substitute the server clock',()=>{
 const f=narrativeContextFixture(),c=reading(f);c.sources[0].publishedAt='2020-06-30T12:00:00Z';c.evidenceCutoff='2026-11-01T00:00:00Z';assert.equal(currentEventYear(c),2020);
 c.sources[0].publishedAt=null;assert.equal(currentEventYear(c),2026);
 assert.match(crossContextProblem(f.lens.parallels[0],f.current,f.historical,NaN)!,/date is not established/);
});
test('a named principal repeated in the facts is caught even when the proposed mapping omits them',()=>{
 const f=narrativeContextFixture();sharedPrincipal(f);
 assert.ok(!f.lens.parallels[0].analogy!.mapping.some(m=>/Kardashian/.test(m.now+m.then)));
 assert.deepEqual(sharedNamedPrincipals(f.current,f.historical.narrativeRecord!),['Kim Kardashian']);
 assert.match(crossContextProblem(f.lens.parallels[0],f.current,f.historical,2026)!,/repeats a current principal/);
 f.lens.parallels[0].crossContext=null;f.lens.parallels[0].causalTest=null;
 assert.equal(hasHistoricalReading(reading(f)),false,'Removing new proof must not restore an old self-comparison badge');
 assert.equal(actorNameKey('Dr. Kim Kardashian'),'kim kardashian');
});
test('explicit same-person, same-organization and unresolved identity checks refuse a new parallel',()=>{
 for(const relationship of ['same-person','same-organization','unclear']as const){
  const f=narrativeContextFixture();f.lens.parallels[0].crossContext!.actorChecks[1].relationship=relationship;
  assert.ok(crossContextProblem(f.lens.parallels[0],f.current,f.historical,2026),relationship);assert.equal(hasHistoricalReading(reading(f,true)),false,relationship);
 }
 const f=narrativeContextFixture();f.lens.parallels[0].crossContext!.sharedParticipants=[{name:'A differently named principal',kind:'person',significance:'principal',explanation:'The source check recognises an alias of a central person appearing in both cases.'}];
 assert.match(crossContextProblem(f.lens.parallels[0],f.current,f.historical,2026)!,/same principal person/);
});
test('a public institution can recur across genuinely distinct episodes with an explicit exception',()=>{
 const f=narrativeContextFixture(),p=publicInstitution(f);
 assert.equal(crossContextProblem(p,f.current,f.historical,2026),null);assert.equal(hasHistoricalReading(reading(f,true)),true);
 p.crossContext!.continuingEpisode=true;assert.match(crossContextProblem(p,f.current,f.historical,2026)!,/continuing causal episode/);assert.equal(hasHistoricalReading(reading(f,true)),false);
});
test('both ends must qualify for the public-institution exception',()=>{
 const f=narrativeContextFixture(),p=publicInstitution(f);p.crossContext!.actorChecks[1].thenKind='organization';
 assert.ok(crossContextProblem(p,f.current,f.historical,2026),'A private organisation cannot receive the public-institution exception merely because the current side is public');
});
test('every actual mapped actor needs an identity check, and a stamped reading also needs its causal test',()=>{
 const f=narrativeContextFixture(),p=f.lens.parallels[0];p.crossContext!.actorChecks.pop();
 assert.match(crossContextProblem(p,f.current,f.historical,2026)!,/Every mapped actor/);assert.equal(hasHistoricalReading(reading(f,true)),false);
 const complete=narrativeContextFixture();complete.lens.parallels[0].crossContext=null;assert.equal(hasHistoricalReading(reading(complete,true)),false);
 const noCause=narrativeContextFixture();noCause.lens.parallels[0].causalTest=null;assert.equal(hasHistoricalReading(reading(noCause,true)),false);
 assert.throws(()=>validateNarrativeLens(noCause.lens,noCause.current,[noCause.historical],true,2026),/causal driver/);
 const badCause=narrativeContextFixture();badCause.lens.parallels[0].causalTest!.driverMappings=[99];
 assert.throws(()=>validateNarrativeLens(badCause.lens,badCause.current,[badCause.historical],true,2026),/actual actor mapping/);
});
test('a legitimate distant legacy reading remains available, while nearby and self-comparisons are demoted',()=>{
 const f=narrativeContextFixture();f.lens.parallels[0].crossContext=null;f.lens.parallels[0].causalTest=null;assert.equal(hasHistoricalReading(reading(f)),true);
 const nearby=narrativeContextFixture();nearby.historical.narrativeRecord!.endYear=2021;nearby.lens.parallels[0].crossContext=null;nearby.lens.parallels[0].causalTest=null;assert.equal(hasHistoricalReading(reading(nearby)),false);
 const self=narrativeContextFixture();sharedPrincipal(self,'Dr. Aster Vale');self.lens.parallels[0].crossContext=null;self.lens.parallels[0].causalTest=null;assert.equal(hasHistoricalReading(reading(self)),false);
});
test('legacy ordered comparisons also reject recent episodes and the same named person',()=>{
 const f=narrativeContextFixture();const pair=pairedStorySchema.parse({version:1,current:f.now,historical:f.past,alignment:matchEpisodes(f.now,f.past),reading:f.reading,selection:{candidatesEncoded:1,candidatesMatched:1,method:'ordered-relations-2',review:'automated-source-and-claim-check',note:'Synthetic ordered comparison fixture for a cross-context display guard.'}});
 const c:Comparison={...f.base,pairedStory:pair,primary:f.historical};assert.equal(hasHistoricalReading(c),true);
 pair.historical.endYear=2002;assert.equal(hasHistoricalReading(c),false);pair.historical.endYear=1942;
 pair.current.actors.push({id:'named-now',name:'Aster Vale',kind:'person',aliases:[],anchorIds:['a'],claimedRole:null});pair.historical.actors.push({id:'named-then',name:'Dr. Aster Vale',kind:'person',aliases:[],anchorIds:['a'],claimedRole:null});assert.equal(hasHistoricalReading(c),false);
});

test('indexed identity checks survive descriptive labels without rewriting frozen evidence',()=>{
 const f=narrativeContextFixture(),raw=structuredClone(f.lens),before=JSON.stringify(f.current);
 raw.parallels[0].analogy!.mapping[0].now='Workers controlling the deliveries';
 raw.parallels[0].analogy!.mapping[0].then='Earlier workers controlling their deliveries';
 raw.parallels[0].crossContext!.actorChecks.forEach((check,i)=>{check.mappingIndex=i;delete check.now;delete check.then;});
 const original=structuredClone(raw),result=validateNarrativeLens(raw,f.current,[f.historical],true,2026);
 assert.equal(result.parallels[0].crossContext!.actorChecks[0].now,result.parallels[0].analogy!.mapping[0].now);
 assert.deepEqual(raw,original,'Reference expansion happens only in the parsed copy');assert.equal(JSON.stringify(f.current),before);
 raw.parallels[0].crossContext!.actorChecks[1].mappingIndex=0;
 assert.throws(()=>validateNarrativeLens(raw,f.current,[f.historical],true,2026),/distinct actual mapping rows/);
});
