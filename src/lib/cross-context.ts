import type {Comparison,HistoricalCase} from './comparison';
import type {CurrentFrame,NarrativeLens} from './narrative-comparison';

export const CROSS_CONTEXT_POLICY='cross-context-1' as const;
// A product boundary for cross-generational discovery, not an empirical law.
export const MIN_HISTORICAL_DISTANCE_YEARS=25;
export const PREFERRED_HISTORICAL_DISTANCE_YEARS=50;
export function requiresCrossContextProof(c:Pick<Comparison,'research'>){
 const version=Number(c.research?.version.match(/^narrative-research-(\d+)$/)?.[1]||0);
 return c.research?.comparisonPolicy===CROSS_CONTEXT_POLICY||version>=11;
}
export function currentEventYear(c:Pick<Comparison,'sources'|'evidenceCutoff'>){
 const date=c.sources.find(s=>s.kind==='reporting')?.publishedAt||c.sources[0]?.publishedAt||c.evidenceCutoff;
 return new Date(date).getUTCFullYear();
}
export const actorNameKey=(name:string)=>name.normalize('NFKC').toLocaleLowerCase().replace(/\b(?:mr|mrs|ms|dr|sir|president|prime minister|professor)\.?\s+/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const nonPerson=/\b(?:government|states|kingdom|republic|party|democrats|republicans|congress|parliament|house|senate|bank|council|committee|company|corporation|group|team|staff|workers|researchers|authorities|audience|collective|establishment|factory|court|ministry|department|university|institute|assembly|united|national)\b/i;
const likelyPerson=(name:string)=>{const clean=name.replace(/^(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Sir|President|Prime Minister)\s+/i,'');return !nonPerson.test(clean)&&/^[\p{Lu}][\p{L}'’.-]+(?:\s+[\p{Lu}][\p{L}'’.-]+){1,3}$/u.test(clean);};
/** An additional obvious-name guard; the source-based identity review also
 * checks aliases and principals omitted from a proposed actor mapping. */
export function sharedNamedPrincipals(current:Pick<CurrentFrame,'cast'>,historical:NonNullable<HistoricalCase['narrativeRecord']>){
 const names=current.cast.flatMap(c=>c.actor.split(/\s+(?:and|&)\s+/)).filter(likelyPerson);
 const pastText=' '+actorNameKey([...historical.cast.map(c=>c.actor),...historical.facts.map(f=>f.text)].join(' '))+' ';
 return names.filter(name=>pastText.includes(' '+actorNameKey(name)+' '));
}
export function crossContextProblem(p:NarrativeLens['parallels'][number],current:Pick<CurrentFrame,'cast'>,historical:HistoricalCase,year:number,requireProof=true):string|null{
 const h=historical.narrativeRecord,end=h?.endYear;
 if(!h||end===null||end===undefined||!Number.isFinite(year))return 'The historical period or current event date is not established.';
 if(year-end<MIN_HISTORICAL_DISTANCE_YEARS)return `A featured historical parallel needs at least ${MIN_HISTORICAL_DISTANCE_YEARS} years from the end of its documented case; this is recent context.`;
 const shared=sharedNamedPrincipals(current,h);if(shared.length)return `The historical case repeats a current principal (${shared.join(', ')}); this is personal continuity, not cross-case recurrence.`;
 const proof=p.crossContext;
 if(!proof)return requireProof?'A cross-context identity and episode check is required.':null;
 if(proof.continuingEpisode)return 'A continuing causal episode cannot serve as independent historical recurrence.';
 if(proof.sharedParticipants.some(a=>a.kind==='person'&&a.significance==='principal'))return 'The same principal person appears in both cases.';
 if(proof.actorChecks.some(a=>['same-person','same-organization','unclear'].includes(a.relationship)))return 'A principal mapping must use distinct actors; unresolved identity and organisational backstory are insufficient.';
 for(const [index,mapping] of (p.analogy?.mapping||[]).entries()){
  const check=proof.actorChecks.find(a=>a.mappingIndex===index||(a.mappingIndex===undefined&&actorNameKey(a.now||'')===actorNameKey(mapping.now)&&actorNameKey(a.then||'')===actorNameKey(mapping.then)));
  if(!check)return 'Every mapped actor needs a source-based identity check.';
  if(['same-person','same-organization','unclear'].includes(check.relationship))return 'A principal mapping must use distinct actors; unresolved identity and organisational backstory are insufficient.';
  if(check.relationship==='shared-public-institution'&&(!['public-institution','polity'].includes(check.nowKind)||!['public-institution','polity'].includes(check.thenKind)))return 'A durable institution exception needs an explicitly identified public institution and different episode.';
  if(check.relationship==='distinct'&&actorNameKey(mapping.now)===actorNameKey(mapping.then)&&['person','organization'].includes(check.nowKind))return 'Identical principal identities cannot be declared distinct.';
 }
 return null;
}
