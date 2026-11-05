import {modelTerms,type ModelTermId} from './narrative-model';
const aliases:Array<[string,ModelTermId]>=[['Shadow projection','projection'],['shadow projection','projection'],['Threshold Guardian','guardian'],["Sorcerer’s Apprentice",'apprentice'],["Sorcerer's Apprentice",'apprentice']];
const phrases=[...aliases,...modelTerms.filter(t=>t.id!=='unclear').flatMap(t=>[[t.name,t.id],[t.name.replace(/^The /,''),t.id]] as Array<[string,ModelTermId]>)].sort((a,b)=>b[0].length-a[0].length);
const lookup=new Map(phrases),escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const expression=`\\b(${[...new Set(phrases.map(p=>p[0]))].map(escape).join('|')})\\b`;
/** Only proper narrative terms, never ordinary lower-case words or source quotations. */
export function narrativeSegments(text:string):Array<{text:string;term?:ModelTermId}>{
 const parts:Array<{text:string;term?:ModelTermId}>=[];let at=0;
 for(const match of text.matchAll(new RegExp(expression,'g'))){
  const start=match.index!,word=match[0],term=lookup.get(word)!,before=text.slice(Math.max(0,start-35),start),after=text.slice(start+word.length,start+word.length+65);
  if(term==='guardian'&&(/(?:according to|reported by|published (?:in|by)|in)\s*$/i.test(before)||/^\s*(?:reports?|reported|says|said|article|account|coverage|newspaper|journalist)\b/i.test(after)))continue;
  if(term==='compensation'&&/[£$€]\s?\d|\b(?:damages|payout|salary|insurance|awarded|payment)\b/i.test(before+after)&&!/\b(?:attitude|opposite|one-sided|counterpressure)\b/i.test(before+after))continue;
  if(term==='inflation'&&/\b(?:prices?|percent|\d|economic|consumer|interest rates?|cost of living)\b/i.test(before+after))continue;
  parts.push({text:text.slice(at,start)},{text:word,term});at=start+word.length;
 }
 parts.push({text:text.slice(at)});return parts;
}
