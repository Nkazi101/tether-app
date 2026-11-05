import {requiresCrossContextProof,MIN_HISTORICAL_DISTANCE_YEARS,currentEventYear,crossContextProblem,actorNameKey} from './cross-context';
import type {Comparison} from './comparison';
/** Reuse only an explicitly sourced result or the checked continuation. */
export function historicalResult(comparison:Comparison,caseId=comparison.primary?.id){
 const past=[comparison.primary,...comparison.alternatives.map(a=>a.historicalCase)].find(c=>c?.id===caseId);
 if(!past?.narrativeRecord)return null;
 const outcome=past.narrativeRecord.outcome;
 if(outcome)return{narrative:past.narrativeRecord.eventKind==='narrative-artifact',text:outcome.summary,asOf:outcome.asOf,status:outcome.status,factIds:outcome.factIds,basis:'outcome' as const};
 const continuation=comparison.narrativeLens?.parallels.find(p=>p.caseId===caseId)?.continuation;
 if(!continuation)return null;
 const facts=continuation.historicalFactIds.map(id=>past.narrativeRecord!.facts.find(f=>f.id===id)).filter(Boolean);
 return facts.length?{narrative:past.narrativeRecord.eventKind==='narrative-artifact',text:facts.map(f=>f!.text).join(' '),asOf:past.period,status:'observed' as const,factIds:continuation.historicalFactIds,basis:'continuation' as const}:null;
}

export function hasHistoricalReading(c:Comparison){
 const year=currentEventYear(c);
 if(c.narrativeLens&&c.currentFrame){const cases=[c.primary,...c.alternatives.map(a=>a.historicalCase)];return Boolean(c.narrativeLens.parallels.length&&c.narrativeLens.parallels.every(p=>{const historical=cases.find(h=>h?.id===p.caseId);return historical&&p.analogy&&p.analogy.mapping.length>=2&&!crossContextProblem(p,c.currentFrame!,historical,year,requiresCrossContextProof(c))&&(!(requiresCrossContextProof(c))||p.causalTest);}));}
 if(c.pairedStory){const h=c.pairedStory.historical;if(h.endYear===null||!Number.isFinite(year)||year-h.endYear<MIN_HISTORICAL_DISTANCE_YEARS)return false;const names=new Set(c.pairedStory.current.actors.filter(a=>a.kind==='person').map(a=>actorNameKey(a.name)));return !h.actors.some(a=>a.kind==='person'&&names.has(actorNameKey(a.name)));}
 return false;
}
