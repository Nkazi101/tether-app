import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalCases, CANON_EDITION } from "../server/domain/canon";
import { matchEpisodes, rankEpisodes } from "../server/domain/structure-match";
import { episodeSchema, type NarrativeEpisode } from "../src/lib/episodes";

// Deliberately synthetic probes derived from the encoded corpus. This checks retrieval
// invariants; it cannot measure extraction, factual truth, usefulness or all-history recall.
const results: Array<{id:string;kind:string;expected:boolean;matched:boolean;pass:boolean}> = [];
function record(id:string,kind:string,expected:boolean,a:NarrativeEpisode,b:NarrativeEpisode){const matched=!!matchEpisodes(a,b);results.push({id,kind,expected,matched,pass:expected===matched});}
for(const item of canonicalCases){
  const past=item.episode!;
  const now=episodeSchema.parse({...past,id:`probe-${past.id}`,title:"Synthetic renamed probe",period:"2026",startYear:2026,endYear:2026,startDate:null,endDate:null});
  record(item.id,"same-structure",true,now,past);
  const relabelled=structuredClone(past);relabelled.title="Unrelated words and identities";relabelled.actors.forEach((a,i)=>{a.name=`Different actor ${i}`;a.aliases=[];});relabelled.resources.forEach((r,i)=>{r.name=`Different material ${i}`;});
  record(item.id,"vocabulary-invariance",true,now,relabelled);
  const future={...past,startYear:2027,endYear:2027};record(item.id,"future-case-rejection",false,now,future);
  const repeated=structuredClone(past);repeated.relations.forEach(r=>r.predicate="supports");record(item.id,"one-generic-action",false,now,repeated);
  const modality=structuredClone(past);modality.beats.forEach(b=>b.temporalBasis="occurred");const planned=structuredClone(now);planned.beats.forEach(b=>b.temporalBasis="announced");record(item.id,"announced-is-not-implemented",false,planned,modality);
}
const ranking = canonicalCases.map(item=>{const past=item.episode!;const now=episodeSchema.parse({...past,id:`rank-${past.id}`,period:"2026",startYear:2026,endYear:2026,startDate:null,endDate:null});const ranked=rankEpisodes(now,canonicalCases.map(c=>({episode:c.episode!})));return {id:item.id,retrieved:ranked.some(r=>r.candidate.episode.id===past.id),first:ranked[0]?.candidate.episode.id||null};});
const report={version:1,edition:CANON_EDITION,corpusHash:createHash("sha256").update(JSON.stringify(canonicalCases)).digest("hex"),generatedAt:new Date().toISOString(),classification:"synthetic-structural-regression",independentHistoricalAccuracy:null,extractionAccuracy:null,worldwideRecall:null,cases:canonicalCases.length,checks:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass),selfRetrieval:{retrieved:ranking.filter(r=>r.retrieved).length,total:ranking.length},limitations:["Probes are derived from this corpus, not a held-out independent set.","No human or model rating is counted as independent factual validation.","Self-retrieval and corruption rejection do not measure insight or real-world accuracy."],results,ranking};
writeFileSync("server/data/structural-benchmark.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,results:undefined,ranking:undefined},null,2));
if(report.failed.length)process.exitCode=1;
