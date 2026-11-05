export type HistoricalEpisodeIdentity={id:string;sources:Array<{id:string;url:string|null}>;narrativeRecord?:{startYear:number|null;endYear:number|null;facts:Array<{evidence:Array<{sourceId:string;passage:string}>}>};episode?:{startYear:number|null;endYear:number|null;anchors:Array<{sourceId:string;passage:string}>}|null};

const textKey=(text:string)=>text.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const sourceKey=(value:string)=>{try{const url=new URL(value);url.hash='';url.hostname=url.hostname.replace(/^www\./,'');for(const key of [...url.searchParams.keys()])if(/^(?:utm_|at_|fbclid|gclid)/i.test(key))url.searchParams.delete(key);return url.href.replace(/\/$/,'');}catch{return value;}};
function datedSpan(c:HistoricalEpisodeIdentity){return c.narrativeRecord?{start:c.narrativeRecord.startYear,end:c.narrativeRecord.endYear}:c.episode?{start:c.episode.startYear,end:c.episode.endYear}:null;}
function anchoredPassages(c:HistoricalEpisodeIdentity){
 const sources=new Map(c.sources.flatMap(s=>s.url?[[s.id,sourceKey(s.url)] as const]:[]));
 const passages=c.narrativeRecord?.facts.flatMap(f=>f.evidence.map(e=>({sourceId:e.sourceId,passage:e.passage})))||c.episode?.anchors||[];
 return new Set(passages.flatMap(p=>{const source=sources.get(p.sourceId),text=textKey(p.passage);return source&&text.length>=35?[`${source}|${text}`]:[];}));
}
/** Conservative aliases: same ID, or same bounded episode supported by two exact
 * source passages. A broad shared page or a similar title is not an identity. */
export function sameHistoricalEpisode(a:HistoricalEpisodeIdentity,b:HistoricalEpisodeIdentity){
 if(a.id===b.id)return true;
 const left=datedSpan(a),right=datedSpan(b);
 if(!left||!right||left.start===null||left.end===null||right.start===null||right.end===null||left.start!==right.start||left.end!==right.end)return false;
 const passages=anchoredPassages(a),other=anchoredPassages(b);let shared=0;
 for(const passage of passages)if(other.has(passage)&&++shared>=2)return true;
 return false;
}
