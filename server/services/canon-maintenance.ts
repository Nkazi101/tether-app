import type {Comparison} from "../../src/lib/comparison";
import {historicalSearchView} from "../domain/historical-search-view";
import {Store,hash,jobSchema} from "./store";
import {NARRATIVE_RESEARCH_VERSION as RESEARCH_VERSION} from "./narrative-research";

export function researchGap(comparison:Comparison){
 const reason=comparison.research?.diagnostic?.code;
 if(comparison.narrativeLens||comparison.pairedStory||comparison.research?.eventApplicability!=='eligible'||(!comparison.currentEpisode&&!comparison.currentFrame)||!reason||!['no-structural-match','representation','claims','network'].includes(reason))return null;
 if(comparison.currentFrame){const f=comparison.currentFrame;const sketch={kind:f.eventKind,mechanisms:[...f.mechanisms].sort(),roles:f.cast.map(c=>c.figure).sort(),stage:f.stage.stage};return{reason,sketch,cluster:hash(sketch)};}
 const view=historicalSearchView(comparison.currentEpisode!);
 // The cluster key contains shape, not names, dates or article vocabulary.
 const sketch={basis:view.basis,actors:view.actors.map(a=>a.kind).sort(),resources:view.resources.map(r=>r.function).sort(),moments:view.moments.map(m=>m.relationships.map(r=>[r.from,r.action,r.to,r.layer,r.allegedConduct]).sort()),stage:view.stage};
 return {reason,sketch,cluster:hash(sketch)};
}
export async function recordResearchGap(store:Store,comparison:Comparison){
 if(comparison.pairedStory||comparison.narrativeLens){const{error}=await store.db.from('tether_research_gaps').update({status:'filled',updated_at:new Date().toISOString()}).eq('situation_id',comparison.situationId).in('status',['open','scheduled']);if(error)throw error;return true;}
 const gap=researchGap(comparison);if(!gap)return false;
 return store.rpc<boolean>('tether_record_research_gap',{p_analysis:comparison.id,p_cluster:gap.cluster,p_reason:gap.reason,p_sketch:gap.sketch});
}
export const weekKey=(date:Date)=>{const day=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));return day.toISOString().slice(0,10);};

/** Five gap clusters per UTC week; ordinary research gates and caps still apply. */
export async function enqueueCanonExpansion(store:Store,now=new Date()){
 const week=weekKey(now);
 const {data:existing,error:ee}=await store.db.from('tether_jobs').select('payload').eq('kind','research').gte('created_at',week).contains('payload',{canonExpansionWeek:week}).limit(100);if(ee)throw ee;
 const used=new Set((existing||[]).map(j=>j.payload.gapCluster));if(used.size>=5)return{queued:0,week};
 const {data:rows,error}=await store.db.from('tether_research_gaps').select('situation_id,cluster_key,created_at').in('status',['open','scheduled']).in('reason',['no-structural-match','representation','claims']).order('created_at',{ascending:false}).limit(500);if(error)throw error;
 const groups=new Map<string,NonNullable<typeof rows>>();for(const row of rows||[]){const group=groups.get(row.cluster_key)||[];group.push(row);groups.set(row.cluster_key,group);}
 let queued=0;
 for(const [cluster,group]of [...groups].sort((a,b)=>b[1].length-a[1].length)){
  if(used.has(cluster)||used.size>=5)continue;
  const situation=await store.situation(group[0].situation_id);if(!situation?.is_public||!situation.owner_key.startsWith('system:')||!situation.latest_analysis_id)continue;
  const comparison=await store.analysis(situation.latest_analysis_id);if(!comparison||comparison.pairedStory||comparison.narrativeLens)continue;
  // Keep the situation's owner: ordinary atomic publication checks ownership.
  const job=jobSchema.parse(await store.rpc('tether_enqueue',{p_kind:'research',p_key:`canon-gap:${week}:${cluster}`,p_owner:situation.owner_key,p_user:null,p_payload:{input:comparison.title,question:comparison.question,situationId:comparison.situationId,researchFrom:comparison.id,depth:2,forceReassessment:true,gapCluster:cluster,canonExpansionWeek:week,method:RESEARCH_VERSION},p_ip:'canon-expansion',p_user_limit:2000,p_ip_limit:2000,p_global_limit:5000}));
  if(['queued','running'].includes(job.status)){queued++;used.add(cluster);await store.db.from('tether_research_gaps').update({status:'scheduled',updated_at:now.toISOString()}).eq('cluster_key',cluster).eq('status','open');}
 }
 return{queued,week};
}
