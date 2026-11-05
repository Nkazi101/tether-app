import {modelFetch} from './model-transport';
import {z} from "zod";
import {validateEpisode,episodeSchema} from "../../src/lib/episodes";
import type {HistoricalCase} from "../../src/lib/comparison";
import {HISTORICAL_EPISODE_REVIEW_BRIEF,EPISODE_BRIEF} from "../domain/episode-prompts";
import {validateCasePublication} from "../domain/case-review";
import {independentHistoricalSources,hasHistoricalFoundation} from "../domain/source-quality";
import {ResearchDeferred} from "../domain/research-deferred";
import {fetchHistoricalSource} from "./historical-source";
import {encodeHistoricalRecord,NARRATIVE_RESEARCH_VERSION} from "./narrative-research";
import {reserveResearchCall} from "./research";
import {Store,hash,jobSchema,type DurableJob} from "./store";

export function canonCheckDue(c:HistoricalCase,now=new Date()){
 const captures=c.sources.map(s=>Date.parse(s.retrievedAt)).filter(Number.isFinite);
 return Boolean((c.episode||c.narrativeRecord)&&captures.length&&Math.max(...captures)<now.getTime()-90*86400000);
}
/** At most two cases per day, whether triggered by age or a source flag. */
export async function enqueueCanonChecks(store:Store,now=new Date()){
 const day=now.toISOString().slice(0,10);
 const{count,error:ce}=await store.db.from('tether_canon_checks').select('id',{count:'exact',head:true}).gte('created_at',day);if(ce)throw ce;if((count||0)>=2)return{queued:0};
 const flags=await store.rpc<Array<{case_id:string;case_version:string}>>('tether_public_source_flags');
 const cases=(await store.cases()).filter(c=>(c.episode||c.narrativeRecord)&&['source-checked','web-researched'].includes(c.review));let queued=0;
 for(const c of cases.sort((a,b)=>Number(flags.some(f=>f.case_id===b.id&&f.case_version===b.version))-Number(flags.some(f=>f.case_id===a.id&&f.case_version===a.version)))){
  if((count||0)+queued>=2)break;
  const flagged=flags.some(f=>f.case_id===c.id&&f.case_version===c.version);if(!flagged&&!canonCheckDue(c,now))continue;
  const runKey=`${flagged?'flag:'+day:'quarter:'+now.getUTCFullYear()+'-'+Math.floor(now.getUTCMonth()/3)}:${hash([c.id,c.version]).slice(0,24)}`;
  const{data:prior,error:pe}=await store.db.from('tether_canon_checks').select('id').eq('run_key',runKey).maybeSingle();if(pe)throw pe;if(prior)continue;
  const{error}=await store.db.from('tether_canon_checks').insert({run_key:runKey,case_id:c.id,case_version:c.version,status:'queued',reason:flagged?'Reader reported a source issue; automatic evidence check queued.':'Ninety-day source and encoding check queued.'});if(error){if(error.code==='23505')continue;throw error;}
  const job=jobSchema.parse(await store.rpc('tether_enqueue',{p_kind:'research',p_key:`canon-check:${hash(runKey)}`,p_owner:'system:canon',p_user:null,p_payload:{canonCheck:runKey},p_ip:'canon-check',p_user_limit:2000,p_ip_limit:2000,p_global_limit:5000}));if(['queued','running'].includes(job.status))queued++;
 }
 return{queued};
}

/** A fresh source-only draft and separate check, under the ordinary shared caps.
 * A blocked page or model disagreement parks this attempt; it is not proof that
 * the existing historical record is false. Old versions remain immutable.
 */
export async function runCanonCheck(store:Store,job:DurableJob,dependencies:{fetch?:typeof fetch;read?:typeof fetchHistoricalSource}={}){
 if(job.owner_key!=='system:canon'||typeof job.payload.canonCheck!=='string')throw new Error('Invalid canon-check owner.');
 const{data:task,error}=await store.db.from('tether_canon_checks').select('*').eq('run_key',job.payload.canonCheck).single();if(error)throw error;
 if(task.status==='passed'){await enqueueCaseReassessments(store,task.case_id);return;}
 if(task.status!=='queued')return;
 const complete=async(status:'parked'|'passed',reason:string,publication:unknown=null)=>{if(!await store.rpc<boolean>('tether_complete_canon_check',{p_job:job.id,p_lease:job.lease_token,p_check:task.id,p_status:status,p_reason:reason,p_publication:publication}))throw Object.assign(new Error('Canon-check lease expired.'),{code:'40001'});};
 const park=(reason:string)=>complete('parked',reason);
 const c=(await store.cases()).find(c=>c.id===task.case_id&&c.version===task.case_version);
 if(!c||(!c.episode&&!c.narrativeRecord)){await park('This is no longer the active version; no historical claim was changed.');return;}
 if(!process.env.MUSE_API_KEY||process.env.ANALYSIS_MODEL_ENABLED==='false'){await park('Automated source verification is not configured.');return;}
 const read=dependencies.read||fetchHistoricalSource;
 const acquired=await Promise.allSettled(c.sources.filter(s=>s.url).slice(0,4).map(async s=>{
  const fresh=await read(s.url!);if(new URL(fresh.url!).hostname!==new URL(s.url!).hostname)throw new Error('Source changed host.');
  return {...fresh,id:s.id,historicalProvenance:s.historicalProvenance};
 }));
 const sources=acquired.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
 if(independentHistoricalSources(sources).length<2||!hasHistoricalFoundation(sources)){await park('Fresh independent source access was insufficient; this is an access gap, not a factual verdict.');return;}
 if(c.narrativeRecord){
  try{
   const next=await encodeHistoricalRecord(store,{...c,sources},dependencies);
   if(!next){await park('The fresh contextual record did not pass source and claim checks.');return;}
   if(next.narrativeRecord!.startYear!==c.narrativeRecord.startYear||next.narrativeRecord!.endYear!==c.narrativeRecord.endYear){await park('Fresh encoding changed the bounded dates; it was not substituted under the existing case ID.');return;}
   const publication=validateCasePublication({historicalCase:next,reviewer:'Tether automated context source check',reviewedAt:new Date().toISOString(),notes:next.reviewNote,support:[]});
   await complete('passed','Fresh contextual sources and separate automated claim checks passed; earlier versions remain immutable.',publication);
   await enqueueCaseReassessments(store,c.id);
  }catch(error){if((error as Error).message==='capacity')throw new ResearchDeferred();if((error as {code?:string}).code==='40001')throw error;await park('Context source verification did not complete; existing versions were preserved.');}
  return;
 }
 if(!c.episode)return;
 const request=dependencies.fetch||modelFetch;
 const chat=async(prompt:string,max:number)=>{
  if(!await reserveResearchCall(store,Buffer.byteLength(prompt)+max,true))throw new ResearchDeferred();
  const response=await request(`${(process.env.MUSE_API_BASE_URL||'https://api.meta.ai/v1').replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${process.env.MUSE_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(180000),body:JSON.stringify({model:process.env.MUSE_RESEARCH_MODEL||process.env.MUSE_CLASSIFICATION_MODEL||'muse-spark-1.3',temperature:0,reasoning_effort:'minimal',max_completion_tokens:max,response_format:{type:'json_object'},messages:[{role:'user',content:prompt}]})});
  if(!response.ok)throw new Error(`provider-${response.status}`);const value=await response.json();
  const observed=Math.max(0,Math.floor(Number(value.usage?.total_tokens)||0));
  if(observed)await store.rpc('tether_reserve_model',{p_key:'model:observed-tokens',p_limit:1000000000,p_amount:observed});
  return JSON.parse((value.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
 };
 let passed=false;
 try{
  const draft=z.object({episode:episodeSchema.nullable()}).parse(await chat(`${EPISODE_BRIEF}\nEncode only this historical episode from these fresh sources. The title is a discovery lead, not evidence. Return {"episode":EPISODE or null}. No current event or old graph is supplied. TITLE:${c.title}\nSOURCES:${JSON.stringify(sources)}`,6500));
  if(!draft.episode){await park('Fresh sources did not establish an encoded episode.');return;}
  validateEpisode(draft.episode,sources);
  const checked=z.object({episodes:z.array(episodeSchema).max(1),issues:z.array(z.string()).max(12)}).parse(await chat(`${HISTORICAL_EPISODE_REVIEW_BRIEF}\nPROPOSED:${JSON.stringify([draft.episode])}\nSOURCES:${JSON.stringify(sources)}`,7000));
  if(checked.issues.length||checked.episodes.length!==1){await park('The separate automated source check withheld the new version.');return;}
  const episode=validateEpisode(checked.episodes[0],sources);
  if(episode.id!==draft.episode.id)throw new Error('Verifier substituted another episode.');
  const names=(a:typeof episode.actors[number])=>[a.name,...a.aliases].map(n=>n.toLowerCase().replace(/[^\p{L}\p{N}]/gu,''));
  const overlap=c.episode.actors.filter(old=>episode.actors.some(fresh=>names(old).some(n=>n.length>=4&&names(fresh).includes(n)))).length;
  if(episode.startYear!==c.episode.startYear||episode.endYear!==c.episode.endYear||overlap<2){await park('Fresh encoding changed the bounded dates or actor identities. It was not substituted under the existing case ID.');return;}
  const next:HistoricalCase={...c,version:'pending',episode,sources,title:episode.title,period:episode.period,signals:[],initialState:episode.conflict.text,sequence:episode.beats.map(b=>({stage:b.when,description:b.summary,sourceIds:[...new Set(b.anchorIds.map(id=>episode.anchors.find(a=>a.id===id)!.sourceId))]})),outcome:null,narrative:null,review:'web-researched',reviewNote:'Fresh source-only encoding and separate automated source check; not independently historian-reviewed. Earlier versions are retained.',...(c.curation?{curation:{...c.curation,process:'automated-source-review' as const}}:{})};
  next.version=`episode3:${hash(next).slice(0,24)}`;
  const publication=validateCasePublication({historicalCase:next,reviewer:'Tether automated canon source check',reviewedAt:new Date().toISOString(),notes:next.reviewNote,support:[]});
  await complete('passed','New append-only version passed fresh source and separate automated claim checks; not independent factual validation.',publication);
  passed=true;
 }catch(error){if(error instanceof ResearchDeferred||(error as {code?:string}).code==='40001')throw error;await park('Source retrieval, encoding or automated verification did not complete. Existing versions were preserved.');}
 if(passed)await enqueueCaseReassessments(store,c.id);
}

/** Idempotent propagation after a new version. A retry after publication resumes
 * this step; it does not pay to generate the same historical case again. */
async function enqueueCaseReassessments(store:Store,caseId:string){
 const current=(await store.cases()).find(c=>c.id===caseId);if(!current)return;
 for(let offset=0;;offset+=200){
  const{data:heads,error}=await store.db.from('tether_situations').select('id,owner_key,latest_analysis_id').eq('is_public',true).eq('is_walkthrough',false).eq('has_aligned_pair',true).order('id').range(offset,offset+199);if(error)throw error;if(!heads?.length)break;
  const{data:affected,error:ae}=await store.db.from('tether_analyses').select('id,situation_id').in('id',heads.map(h=>h.latest_analysis_id)).eq('payload->primary->>id',caseId);if(ae)throw ae;
  for(const row of affected||[]){const head=heads.find(h=>h.id===row.situation_id);if(!head?.owner_key.startsWith('system:'))continue;const comparison=await store.analysis(row.id);if(!comparison)continue;
   await store.rpc('tether_enqueue',{p_kind:'research',p_key:`canon-recheck:${hash([caseId,current.version,head.id])}`,p_owner:head.owner_key,p_user:null,p_payload:{input:comparison.title,question:comparison.question,situationId:head.id,researchFrom:row.id,depth:1,forceReassessment:true,method:NARRATIVE_RESEARCH_VERSION},p_ip:'canon-recheck',p_user_limit:2000,p_ip_limit:2000,p_global_limit:5000});
  }
  if(heads.length<200)break;
 }
}
