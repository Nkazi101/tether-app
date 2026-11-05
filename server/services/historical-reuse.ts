import {z} from 'zod';
import {topicSchema,type HistoricalCase,type NewsTopic} from '../../src/lib/comparison';
import {sameHistoricalEpisode,type HistoricalEpisodeIdentity} from '../../src/lib/discovery-diversity';
import type {Store} from './store';

const HEAD_LIMIT=500,BATCH_SIZE=50,SOURCE_LIMIT=8,FACT_LIMIT=10,CACHE_MS=30000;
const sourceFields=Array.from({length:SOURCE_LIMIT+1},(_,i)=>[`source${i}Id:payload->primary->sources->${i}->>id`,`source${i}Url:payload->primary->sources->${i}->>url`]).flat();
const factFields=Array.from({length:FACT_LIMIT+1},(_,i)=>`fact${i}:payload->primary->narrativeRecord->facts->${i}->evidence`);
// JSON projections deliberately omit summaries, full source text and current text.
const ANALYSIS_FIELDS=['id','situation_id','caseId:payload->primary->>id','caseTitle:payload->primary->>title','casePeriod:payload->primary->>period','narrativeVersion:payload->narrativeLens->>version','orderedVersion:payload->pairedStory->>version','narrativeStart:payload->primary->narrativeRecord->startYear','narrativeEnd:payload->primary->narrativeRecord->endYear','orderedStart:payload->primary->episode->startYear','orderedEnd:payload->primary->episode->endYear','anchors:payload->primary->episode->anchors',...sourceFields,...factFields].join(',');
const headSchema=z.object({id:z.string().uuid(),latest_analysis_id:z.string().uuid().nullable(),topic:topicSchema});
const metadataSchema=z.object({id:z.string().uuid(),situation_id:z.string().uuid(),caseId:z.string().min(1).nullable(),caseTitle:z.string().nullable(),casePeriod:z.string().nullable(),narrativeVersion:z.string().nullable(),orderedVersion:z.string().nullable(),narrativeStart:z.number().int().nullable(),narrativeEnd:z.number().int().nullable(),orderedStart:z.number().int().nullable(),orderedEnd:z.number().int().nullable(),anchors:z.unknown().optional()}).passthrough();
const evidenceSchema=z.array(z.object({sourceId:z.string(),passage:z.string().max(320)})).max(48);
type PublicHead=z.infer<typeof headSchema>;
type Use={situationId:string;domain:NewsTopic;title:string;period:string;identity:HistoricalEpisodeIdentity};
export type HistoricalReuseEntry={
 id:string;title:string;period:string;startYear:number|null;endYear:number|null;
 /** Number of selected public heads using this earlier episode as their primary. */
 count:number;situationCount:number;domains:NewsTopic[];caseIds:string[];
};
export type HistoricalReuseProfile={
 generatedAt:string;headsScanned:number;headsWithHistoricalReading:number;truncated:boolean;incomplete:boolean;
 missingAnalyses:number;invalidRows:number;aliasProjectionIncomplete:number;
 entries:HistoricalReuseEntry[];topRepeated:HistoricalReuseEntry[];
 /** Distinct current public situations using this case, including conservative aliases. */
 countFor:(historicalCase:HistoricalEpisodeIdentity|HistoricalCase)=>number;
};
function fromRow(head:PublicHead,raw:unknown):{use:Use|null;projectionIncomplete:boolean}{
 const row=metadataSchema.parse(raw);
 if(row.situation_id!==head.id)throw new Error('The selected analysis does not belong to its public head.');
 if(!row.caseId||(!row.narrativeVersion&&!row.orderedVersion))return{use:null,projectionIncomplete:false};
 const sources:HistoricalEpisodeIdentity['sources']=[];let projectionIncomplete=Boolean(row[`source${SOURCE_LIMIT}Id`]||row[`fact${FACT_LIMIT}`]);
 for(let i=0;i<SOURCE_LIMIT;i++){
  const id=row[`source${i}Id`],url=row[`source${i}Url`];if(id===null||id===undefined)continue;
  if(typeof id!=='string'||(url!==null&&typeof url!=='string')){projectionIncomplete=true;continue;}
  sources.push({id,url:url as string|null});
 }
 const facts:Array<{evidence:z.infer<typeof evidenceSchema>}>=[];
 for(let i=0;i<FACT_LIMIT;i++)if(row[`fact${i}`]!==null&&row[`fact${i}`]!==undefined)facts.push({evidence:evidenceSchema.parse(row[`fact${i}`])});
 const anchors=row.anchors===null||row.anchors===undefined?[]:evidenceSchema.parse(row.anchors);
 const hasNarrative=facts.length>0;
 const identity:HistoricalEpisodeIdentity={id:row.caseId,sources,...(hasNarrative?{narrativeRecord:{startYear:row.narrativeStart,endYear:row.narrativeEnd,facts}}:{episode:{startYear:row.orderedStart,endYear:row.orderedEnd,anchors}})};
 const mapped=new Set(sources.filter(s=>s.url).map(s=>s.id));
 if([...facts.flatMap(f=>f.evidence),...anchors].some(e=>!mapped.has(e.sourceId)))projectionIncomplete=true;
 return{use:{situationId:head.id,domain:head.topic,title:row.caseTitle||row.caseId,period:row.casePeriod||'Date not recorded',identity},projectionIncomplete};
}
/** Compile only selected current heads, irrespective of the latest publication
 * policy. This observes exposure; it does not assert that these readings are valid. */
export function compileHistoricalReuseProfile(rawHeads:unknown[],rows:unknown[],options:{truncated?:boolean;generatedAt?:string}={}):HistoricalReuseProfile{
 const heads:PublicHead[]=[];let invalidRows=0,missingAnalyses=0,aliasProjectionIncomplete=0;
 for(const raw of rawHeads){const head=headSchema.safeParse(raw);if(head.success)heads.push(head.data);else invalidRows++;}
 const byId=new Map<string,unknown>();for(const row of rows)if(row&&typeof row==='object'&&'id'in row&&typeof row.id==='string')byId.set(row.id,row);
 type Group={uses:Use[];identities:HistoricalEpisodeIdentity[]};const groups:Group[]=[];let headsWithHistoricalReading=0;
 for(const head of heads){if(!head.latest_analysis_id)continue;const raw=byId.get(head.latest_analysis_id);if(!raw){missingAnalyses++;continue;}
  let extracted:ReturnType<typeof fromRow>;try{extracted=fromRow(head,raw);}catch{invalidRows++;continue;}
  if(extracted.projectionIncomplete)aliasProjectionIncomplete++;const use=extracted.use;if(!use)continue;headsWithHistoricalReading++;
  const matching=groups.filter(g=>g.identities.some(identity=>sameHistoricalEpisode(identity,use.identity)));
  if(!matching.length){groups.push({uses:[use],identities:[use.identity]});continue;}
  const group=matching[0];group.uses.push(use);group.identities.push(use.identity);
  for(const other of matching.slice(1)){group.uses.push(...other.uses);group.identities.push(...other.identities);groups.splice(groups.indexOf(other),1);}
 }
 const entries=groups.map(group=>{const first=group.uses[0],span=first.identity.narrativeRecord||first.identity.episode;return{id:first.identity.id,title:first.title,period:first.period,startYear:span?.startYear??null,endYear:span?.endYear??null,count:group.uses.length,situationCount:new Set(group.uses.map(u=>u.situationId)).size,domains:[...new Set(group.uses.map(u=>u.domain))].sort(),caseIds:[...new Set(group.identities.map(i=>i.id))].sort()};}).sort((a,b)=>b.situationCount-a.situationCount||a.id.localeCompare(b.id));
 const truncated=Boolean(options.truncated);
 return{generatedAt:options.generatedAt||new Date().toISOString(),headsScanned:rawHeads.length,headsWithHistoricalReading,truncated,incomplete:truncated||missingAnalyses>0||invalidRows>0||aliasProjectionIncomplete>0,missingAnalyses,invalidRows,aliasProjectionIncomplete,entries,topRepeated:entries.filter(e=>e.situationCount>1).slice(0,12),countFor:c=>{const situations=new Set<string>();for(const group of groups)if(group.identities.some(identity=>sameHistoricalEpisode(identity,c)))for(const use of group.uses)situations.add(use.situationId);return situations.size;}};
}
async function loadProfile(store:Store){
 // Do not filter has_aligned_pair: a new method can demote an old lens, but its
 // previous concentration must not disappear from the search incentive.
 const{data:allHeads,error}=await store.db.from('tether_situations').select('id,latest_analysis_id,topic').eq('is_public',true).eq('is_walkthrough',false).not('latest_analysis_id','is',null).order('reported_at',{ascending:false}).order('id',{ascending:false}).limit(HEAD_LIMIT+1);
 if(error)throw error;
 const rawHeads=(allHeads||[]).slice(0,HEAD_LIMIT),ids=[...new Set(rawHeads.flatMap(h=>typeof h.latest_analysis_id==='string'?[h.latest_analysis_id]:[]))],rows:unknown[]=[];
 // Metadata-only batches stay below typical proxy URL limits. Every ID came
 // from the checked public-head query, never from a caller's arbitrary list.
 for(let i=0;i<ids.length;i+=BATCH_SIZE){const{data,error}=await store.db.from('tether_analyses').select(ANALYSIS_FIELDS).in('id',ids.slice(i,i+BATCH_SIZE));if(error)throw error;rows.push(...(data||[]));}
 return compileHistoricalReuseProfile(rawHeads,rows,{truncated:(allHeads||[]).length>HEAD_LIMIT});
}
type Cache={database:Store['db'];pending:boolean;expires:number;promise:Promise<HistoricalReuseProfile>};
const caches=new WeakMap<Store,Cache>();
/** Coalesce concurrent requests per Store/project. Successful snapshots live for
 * 30 seconds; failed reads are not cached and never become an empty census. */
export function getHistoricalReuseProfile(store:Store):Promise<HistoricalReuseProfile>{
 const existing=caches.get(store);if(existing&&existing.database===store.db&&(existing.pending||Date.now()<existing.expires))return existing.promise;
 const entry:Cache={database:store.db,pending:true,expires:0,promise:Promise.resolve(null as unknown as HistoricalReuseProfile)};
 entry.promise=loadProfile(store).then(profile=>{entry.pending=false;entry.expires=Date.now()+CACHE_MS;return profile;},error=>{if(caches.get(store)===entry)caches.delete(store);throw error;});caches.set(store,entry);return entry.promise;
}
