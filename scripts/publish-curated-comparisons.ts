/** Publish source-audited editorial versions without claiming separate-model/human review. */
import dotenv from "dotenv";
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {getSupabaseServerClient} from "../src/lib/supabase/server";
import {validateComparison,type Comparison} from "../src/lib/comparison";
import {canonicalCases,CANON_EDITION} from "../server/domain/canon";
import {historicalPacketKey} from "../server/services/episode-research";
import {Store,hash,jobSchema} from "../server/services/store";
import {validateCasePublication} from "../server/domain/case-review";
dotenv.config({path:'.env.local',override:true,quiet:true});dotenv.config({quiet:true});
const mode=process.argv[2];if(!['--validate','--publish'].includes(mode))throw new Error('Use --validate or --publish.');
const proposals=JSON.parse(readFileSync('audit/coverage-expansion/curated-proposals.json','utf8')) as Array<{expectedHead:string;sourceFingerprint:string;comparison:Comparison}>;
for(const p of proposals){const c=validateComparison(p.comparison);if(c.pairedStory?.selection.review!=='agent-source-and-structure-check'||c.research?.currentReview!=='agent-source-audit'||c.research?.historicalReview!=='agent-source-audit')throw new Error('Editorial provenance must be explicit.');}
if(mode==='--validate'){console.log(JSON.stringify({valid:proposals.length}));process.exit(0);}
const db=getSupabaseServerClient(),store=new Store(db);
const filename='audit/coverage-expansion/publications.json';
const published: Array<{situationId:string;analysisId:string;title:string}>=existsSync(filename)?JSON.parse(readFileSync(filename,'utf8')):[];
// Preserve each source-audited case as a reusable append-only database version.
for(const historicalCase of canonicalCases){const publication=validateCasePublication({historicalCase,reviewer:'Tether agent source audit',reviewedAt:new Date().toISOString(),notes:historicalCase.reviewNote,support:[]});const{error}=await db.from('tether_case_versions').insert({case_id:historicalCase.id,version:historicalCase.version,payload:publication,reviewed_by:publication.reviewer,reviewed_at:publication.reviewedAt});if(error&&error.code!=='23505')throw error;}
const cases=await store.cases();
for(const proposal of proposals){
 if(published.some(p=>p.situationId===proposal.comparison.situationId))continue;
 const situation=await store.situation(proposal.comparison.situationId);const previous=situation?.latest_analysis_id?await store.analysis(situation.latest_analysis_id):null;
 if(!situation?.is_public||!situation.owner_key.startsWith('system:')||!previous||previous.id!==proposal.expectedHead||historicalPacketKey(previous.sources)!==proposal.sourceFingerprint)throw new Error('Public source or head changed; the editorial proposal needs reassessment.');
 const queued=jobSchema.parse(await store.rpc('tether_enqueue',{p_kind:'research',p_key:`curated:${CANON_EDITION}:${situation.id}`,p_owner:situation.owner_key,p_user:null,p_payload:{situationId:situation.id,researchFrom:previous.id,input:previous.title,question:previous.question},p_ip:'source-canon-curation',p_user_limit:2000,p_ip_limit:2000,p_global_limit:5000}));
 if(queued.status==='succeeded'&&queued.result_id){published.push({situationId:situation.id,analysisId:queued.result_id,title:previous.title});writeFileSync(filename,JSON.stringify(published,null,2));continue;}
 if(queued.status!=='queued')throw new Error('This editorial job is already leased; do not override it.');
 const lease=randomUUID();
 const{data:claimed,error}=await db.from('tether_jobs').update({status:'running',lease_token:lease,lease_expires_at:new Date(Date.now()+180000).toISOString(),attempts:queued.attempts+1,updated_at:new Date().toISOString()}).eq('id',queued.id).eq('status','queued').select('*').maybeSingle();
 if(error)throw error;if(!claimed)throw new Error('Editorial claim changed concurrently.');
 const comparison=validateComparison({...proposal.comparison,archiveVersion:hash({reviewed:cases.filter(c=>c.review!=='web-researched'),canon:CANON_EDITION})});
 await store.publish(jobSchema.parse(claimed),comparison,situation.identity_key,true);
 published.push({situationId:situation.id,analysisId:comparison.id,title:comparison.title});writeFileSync(filename,JSON.stringify(published,null,2));
}
console.log(JSON.stringify({published},null,2));
