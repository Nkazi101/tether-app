/** Internal corpus coverage probe. No self matches and no historical-accuracy claim. */
import {writeFileSync} from 'node:fs';
import {canonicalCases} from '../server/domain/canon';
import {rankEpisodes} from '../server/domain/structure-match';
const queries=canonicalCases.filter(c=>c.episode);
const evaluate=(pool:typeof queries)=>queries.map(query=>{
 const candidates=pool.filter(c=>c.id!==query.id&&c.episode!.id!==query.episode!.id).map(c=>({episode:c.episode!,caseId:c.id}));
 const ranked=rankEpisodes(query.episode!,candidates);
 return {query:query.id,candidates:candidates.length,matches:ranked.length,top:ranked.slice(0,3).map(r=>({caseId:r.candidate.caseId,weight:r.weight,groups:r.alignment.counts.beats,actions:r.alignment.counts.predicates}))};
});
const leaveOneOut=evaluate(queries);
const saturation=[4,8,queries.length].map(size=>{
 const rows=evaluate(queries.slice(0,size));const weights=rows.map(r=>r.top[0]?.weight||0).sort((a,b)=>a-b);
 return {cases:size,queries:rows.length,withStructuralCandidate:rows.filter(r=>r.matches>0).length,medianInternalWeight:weights[Math.floor(weights.length/2)]};
});
const report={classification:'internal-corpus-coverage-probe',generatedAt:new Date().toISOString(),cases:queries.length,leaveOneOut,saturation,accuracy:null,globalMissRate:null,limitations:['Queries and candidates come from the development canon, not held-out ground truth.','Self cases are removed. A cross-case structural fit is not semantic validation.','Historical episodes are retrospective; this is not an as-of-date forecast test.','The fixed corpus order affects this small growth curve. It cannot identify a sufficient size for all history.','The ACL 2025 popular-analogy benchmark has not been encoded or run by this script.']};
writeFileSync('audit/narrative-model/canon-evaluation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({cases:queries.length,leaveOneOutWithCandidate:leaveOneOut.filter(r=>r.matches).length,saturation,accuracy:null}));
