import type {Comparison,NewsTopic} from './comparison';
import {hasHistoricalReading} from './reading-trajectory';

import {sameHistoricalEpisode} from './historical-episode-identity';
export {sameHistoricalEpisode,type HistoricalEpisodeIdentity} from './historical-episode-identity';

const qualifies=(c:Comparison)=>Boolean(hasHistoricalReading(c)&&c.primary&&['source-checked','web-researched'].includes(c.primary.review));
const duplicate=(candidate:Comparison,selected:Comparison[])=>selected.some(s=>s.situationId===candidate.situationId||Boolean(s.primary&&candidate.primary&&sameHistoricalEpisode(s.primary,candidate.primary)));

/** The showcase has one slot per earlier episode. It may be shorter than its
 * visual maximum; repeated cases remain available in the full news feed. */
export function selectFeaturedComparisons(ordered:Comparison[],options:{limit?:number;heroId?:string}={}){
 const limit=Math.max(0,Math.min(12,options.limit??7)),eligible=ordered.filter(qualifies),selected:Comparison[]=[];
 if(!limit)return{hero:undefined,featured:[]};
 const hero=eligible.find(s=>s.id===options.heroId)||eligible[0];
 if(!hero)return{hero:undefined,featured:[]};
 selected.push(hero);
 while(selected.length<limit){
  const available=eligible.filter(s=>!duplicate(s,selected));if(!available.length)break;
  const topics=new Set(selected.map(s=>s.topic));
  selected.push(available.find(s=>!topics.has(s.topic))||available[0]);
 }
 return{hero:selected[0],featured:selected.slice(1)};
}

const categoryOrder:NewsTopic[]=['entertainment','technology','science','culture','business','sports','lifestyle','environment','health','world','politics','general'];
/** Widen showcase recall independently of chronological pagination. Qualified
 * candidates are interleaved by category, with distinct earlier episodes first. */
export function discoveryCandidateOrder(readings:Comparison[],limit=80){
 const groups=new Map<NewsTopic,Comparison[]>();
 for(const c of readings.filter(qualifies))groups.set(c.topic,[...(groups.get(c.topic)||[]),c]);
 const mixed:Comparison[]=[];
 while([...groups.values()].some(g=>g.length))for(const category of categoryOrder){const next=groups.get(category)?.shift();if(next)mixed.push(next);}
 const novel:Comparison[]=[],repeated:Comparison[]=[];
 for(const c of mixed)(duplicate(c,novel)?repeated:novel).push(c);
 return[...novel,...repeated].slice(0,Math.max(0,Math.min(120,limit)));
}
