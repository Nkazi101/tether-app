import type {NarrativeEpisode} from "../../src/lib/episodes";
import type {HistoricalCase} from "../../src/lib/comparison";
import {eraFor,regionsFor} from "../../src/lib/corpus-coverage";

/** A cheap recall layer, not the final fit score. No headline/name embeddings. */
export function retrieveHistoricalCandidates(current:NarrativeEpisode,cases:HistoricalCase[],limit=80){
 const eligible=cases.filter(c=>c.episode&&['source-checked','web-researched'].includes(c.review));
 const predicates=new Set(current.relations.map(r=>r.predicate)),resources=new Set(current.resources.map(r=>r.kind));
 const figureIds=new Set(current.symbolic?.roles.map(r=>r.figure)||[]),dynamicIds=new Set(current.symbolic?.dynamics.map(d=>d.dynamic)||[]),stage=current.symbolic?.arc?.stage;
 const ordered=[...eligible].sort((a,b)=>{
  const score=(c:HistoricalCase)=>new Set(c.episode!.relations.filter(r=>predicates.has(r.predicate)).map(r=>r.predicate)).size*4+c.episode!.resources.filter(r=>resources.has(r.kind)).length;
  return score(b)-score(a)||a.id.localeCompare(b.id);
 });
 const channels={structural:ordered.slice(0,40),symbolic:ordered.filter(c=>c.episode!.symbolic?.roles.some(r=>figureIds.has(r.figure))||c.episode!.symbolic?.dynamics.some(d=>dynamicIds.has(d.dynamic))).slice(0,15),arc:stage&&stage!=='unclear'?ordered.filter(c=>c.episode!.symbolic?.arc?.stage===stage).slice(0,15):[],curated:ordered.filter(c=>c.curation?.process==='agent-source-audit').slice(0,20)};
 const candidates=[...new Map([...channels.structural,...channels.symbolic,...channels.arc,...channels.curated].map(c=>[c.id,c])).values()].slice(0,limit);
 return {candidates,examined:eligible.length,channels:Object.fromEntries(Object.entries(channels).map(([name,rows])=>[name,rows.length])),truncated:candidates.length<eligible.length};
}
export function diversityAudit(cases:Array<Pick<HistoricalCase,'id'|'episode'|'curation'>>){
 const top=cases[0];
 const distant=top&&!regionsFor(top).includes('unknown')&&eraFor(top.episode!.startYear)!=='unknown'?cases.slice(1).find(c=>eraFor(c.episode!.startYear)!==eraFor(top.episode!.startYear)&&eraFor(c.episode!.startYear)!=='unknown'&&regionsFor(c).some(r=>r!=='unknown'&&!regionsFor(top).includes(r))):undefined;
 return {status:distant?'structural-candidate-found':'not-established',caseId:distant?.id||null,note:'Only candidates that pass the beat comparator are considered. A distant candidate needs its own claim review; geographic separation does not establish cultural independence.'};
}
