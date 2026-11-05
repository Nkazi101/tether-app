import { Store,hash,jobSchema } from "./store";
import { CANON_EDITION } from "../domain/canon";
import { NARRATIVE_RESEARCH_VERSION as RESEARCH_VERSION } from "./narrative-research";
import { reportingEvidence } from "../domain/reporting";

/** Bounded, idempotent background migration; old evidence and analyses stay intact. */
export async function enqueuePublicBackfill(store:Store,limit=12) {
 const {data:heads,error}=await store.db.from('tether_situations').select('id,owner_key,latest_analysis_id').eq('is_public',true).eq('is_walkthrough',false).order('reported_at',{ascending:false}).limit(500);
 if(error)throw error;
 if(heads?.length)await store.rpc('tether_supersede_public_research',{p_situations:heads.filter(h=>h.owner_key.startsWith('system:')).map(h=>h.id),p_method:RESEARCH_VERSION,p_before:new Date().toISOString()});
 const {data:pending,error:pe}=await store.db.from('tether_jobs').select('payload').eq('kind','research').in('status',['queued','running']).limit(1000);if(pe)throw pe;
 const already=new Set((pending||[]).map(j=>j.payload.situationId));
 // Older queued requests identify their origin analysis rather than the situation.
 const originIds=[...new Set((pending||[]).flatMap(j=>typeof j.payload.researchFrom==='string'?[j.payload.researchFrom]:[]))];
 if(originIds.length){const{data:origins,error:oe}=await store.db.from('tether_analyses').select('situation_id').in('id',originIds);if(oe)throw oe;for(const origin of origins||[])already.add(origin.situation_id);}
 let queued=0,skipped=0;
 for(const head of heads||[]){if(queued>=Math.min(200,limit))break;if(!head.owner_key.startsWith('system:')||already.has(head.id)){skipped++;continue;}
  const previous=head.latest_analysis_id&&await store.analysis(head.latest_analysis_id);if(!previous)continue;
  if(previous.research?.version===RESEARCH_VERSION){skipped++;continue;}
  const fingerprint=hash(reportingEvidence(previous.sources)).slice(0,20);
  const job=jobSchema.parse(await store.rpc('tether_enqueue',{p_kind:'research',p_key:`backfill:${RESEARCH_VERSION}:${CANON_EDITION}:${head.id}:${fingerprint}`,p_owner:head.owner_key,p_user:null,p_payload:{situationId:head.id,researchFrom:previous.id,input:previous.title,question:previous.question,sources:previous.sources,depth:1,forceReassessment:true,method:RESEARCH_VERSION},p_ip:'research-backfill',p_user_limit:2000,p_ip_limit:2000,p_global_limit:5000}));
  if(['queued','running'].includes(job.status))queued++;else skipped++;
 }
 return {queued,skipped,method:RESEARCH_VERSION,edition:CANON_EDITION};
}
