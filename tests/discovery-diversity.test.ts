import test from 'node:test';
import assert from 'node:assert/strict';
import {narrativeContextFixture} from './fixtures/narrative-context';
import {sameHistoricalEpisode,selectFeaturedComparisons,discoveryCandidateOrder} from '../src/lib/discovery-diversity';
import type {Comparison,HistoricalCase,NewsTopic} from '../src/lib/comparison';

function story(id:string,topic:NewsTopic,year=1942,caseId='history:'+id):Comparison{
 const f=narrativeContextFixture(),primary=structuredClone(f.historical);primary.id=caseId;primary.narrativeRecord!.startYear=year;primary.narrativeRecord!.endYear=year;
 const lens=structuredClone(f.lens);lens.parallels[0].caseId=caseId;
 return{...f.base,id,situationId:'situation:'+id,topic,currentFrame:f.current,narrativeLens:lens,primary,alternatives:[]};
}
test('a showcase avoids repeating an earlier episode while retaining topic variety and the chosen hero',()=>{
 const tech=story('tech','technology'),scienceSame=story('science','science',1942,'alias:renamed-case'),life=story('life','lifestyle',1950),scienceOther=story('other-science','science',1960),techOther=story('other-tech','technology',1970);
 const readings=[tech,scienceSame,life,scienceOther,techOther],before=structuredClone(readings);
 const selected=selectFeaturedComparisons(readings,{heroId:tech.id,limit:7});
 assert.equal(selected.hero,tech);assert.deepEqual(selected.featured.map(c=>c.id),['life','other-science','other-tech']);
 assert.deepEqual(readings,before,'Selection may not swap a primary case or mutate a published reading');
 assert.equal(scienceSame.primary?.id,'alias:renamed-case');
});
test('aliases use their dated source evidence; shared broad pages alone do not collapse distinct events',()=>{
 const a=story('one','technology').primary!,alias=structuredClone(a);alias.id='different-id';alias.title='A different description of the same earlier case';
 alias.sources.forEach(s=>{s.url=s.url!.replace('https://','https://www.')+'?utm_source=feed';});
 assert.ok(sameHistoricalEpisode(a,alias));
 const other=structuredClone(alias);other.narrativeRecord!.facts.forEach((f,i)=>f.evidence.forEach(e=>{e.passage=`Different episode evidence, concerning another decision and its consequences ${i}.`;}));
 assert.equal(sameHistoricalEpisode(a,other),false,'A shared history page is not a shared episode');
 const broad=structuredClone(alias);broad.narrativeRecord!.startYear=1900;broad.narrativeRecord!.endYear=1950;
 assert.equal(sameHistoricalEpisode(a,broad),false,'An overlapping broad historical survey is not automatically the bounded case');
});
test('a small corpus yields a smaller showcase instead of padding it with the same precedent',()=>{
 const a=story('a','science'),b=story('b','technology',1942,'alias:b');
 const selected=selectFeaturedComparisons([a,b],{limit:7});
 assert.equal(selected.hero,a);assert.equal(selected.featured.length,0);
 assert.equal(discoveryCandidateOrder([a,b]).length,2,'Repeated readings are still accessible in the candidate pool and full news feed');
});
test('candidate recall interleaves categories and puts distinct earlier cases before repeated ones',()=>{
 const a=story('a','technology'),b=story('b','technology',1942,'alias:b'),c=story('c','science',1950),d=story('d','entertainment',1960),unread=story('unread','world',1970);
 unread.primary=null;unread.narrativeLens=undefined;
 const selected=discoveryCandidateOrder([a,b,c,d,unread],4);
 assert.deepEqual(selected.map(c=>c.id),['d','a','c','b']);
 assert.ok(!selected.includes(unread),'A plain report cannot be promoted as a historical comparison to fill the visual quota');
 assert.equal(discoveryCandidateOrder([a,b,c,d],2).length,2);
});
