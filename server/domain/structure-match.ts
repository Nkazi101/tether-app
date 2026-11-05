import type { NarrativeEpisode, EpisodeRelation } from "../../src/lib/episodes";
import { type StructuralAlignment, alignmentCounts, sameRelation, validateAlignment, earlierEpisode, chronologyCompatible } from "../../src/lib/structural-alignment";

type State = { nodes: Map<string,string>; beats: StructuralAlignment["beats"]; lastNow: number; lastThen: number };
const pairs = (state: State) => state.beats.flatMap(b => b.relations);
const signature = (state: State) => JSON.stringify({ nodes: [...state.nodes].sort(), beats: state.beats });
function extendNodes(nodes: Map<string,string>, a: EpisodeRelation, b: EpisodeRelation, current: NarrativeEpisode, historical: NarrativeEpisode) {
  const next = new Map(nodes);
  for (const [left,right] of [[a.from,b.from],[a.to,b.to]]) {
    const actorA = current.actors.some(a => a.id === left), actorB = historical.actors.some(a => a.id === right);
    if (actorA !== actorB) return null;
    if (!actorA && current.resources.find(r => r.id === left)?.kind !== historical.resources.find(r => r.id === right)?.kind) return null;
    if ((next.has(left) && next.get(left) !== right) || (!next.has(left) && [...next.values()].includes(right))) return null;
    next.set(left,right);
  }
  return next;
}
function weight(state: State, current: NarrativeEpisode) {
  const edges = pairs(state).map(p => current.relations.find(r => r.id === p.current)!);
  const covered = new Set(state.beats.flatMap(b => b.historicalBeatIds)).size;
  return edges.length * 10 + new Set(edges.map(e => e.predicate)).size * 8 + state.beats.length * 7 - (state.lastThen + 1 - covered) * 2;
}
/** Bounded, monotone relation windows tolerate prose grouping, never reversed known chronology. */
export function matchEpisodes(current: NarrativeEpisode, historical: NarrativeEpisode): StructuralAlignment | null {
  if (!earlierEpisode(current,historical) || current.encoding !== historical.encoding) return null;
  let beam: State[] = [{nodes:new Map(),beats:[],lastNow:-1,lastThen:-1}], visited=0, truncated=false;
  const MAX_STATES=24_000;
  const order = (pair: {current:string;historical:string}) => ({
    current: current.beats.findIndex(b => b.id === current.relations.find(r => r.id === pair.current)!.beatId),
    historical: historical.beats.findIndex(b => b.id === historical.relations.find(r => r.id === pair.historical)!.beatId),
  });
  for (let i=0;i<current.beats.length;i++) {
    const next: State[] = [...beam];
    for (const state of beam) {
      if (state.lastNow >= i) continue;
      for (let width=1;width<=2 && i+width<=current.beats.length;width++) {
        const currentBeatIds=current.beats.slice(i,i+width).map(b=>b.id);
        for (let j=state.lastThen+1;j<historical.beats.length;j++) for(let span=1;span<=2 && j+span<=historical.beats.length;span++) {
          const historicalBeatIds=historical.beats.slice(j,j+span).map(b=>b.id);
          const now=current.relations.filter(r=>currentBeatIds.includes(r.beatId)), then=historical.relations.filter(r=>historicalBeatIds.includes(r.beatId));
          const local: State[]=[];
          const previousOrders=pairs(state).map(order);
          const walk=(k:number,nodes:Map<string,string>,matched:Array<{current:string;historical:string}>,used:Set<string>)=>{
            if (++visited>MAX_STATES) {truncated=true;return;}
            if(k===now.length){
              if(!matched.length) return;
              const earnedNow=new Set(matched.map(p=>current.relations.find(r=>r.id===p.current)!.beatId));
              const earnedThen=new Set(matched.map(p=>historical.relations.find(r=>r.id===p.historical)!.beatId));
              if(earnedNow.size!==width||earnedThen.size!==span)return;
              const candidate={nodes,beats:[...state.beats,{currentBeatIds,historicalBeatIds,relations:matched}],lastNow:i+width-1,lastThen:j+span-1};
              // Separate strands may be joined by a later action. Connectivity is
              // required for the completed mapping by validateAlignment below.
              local.push(candidate);
              return;
            }
            walk(k+1,nodes,matched,used);
            for(const b of then)if(!used.has(b.id)&&sameRelation(now[k],b)){
              const currentBasis=current.beats.find(beat=>beat.id===now[k].beatId)?.temporalBasis;
              const historicalBasis=historical.beats.find(beat=>beat.id===b.beatId)?.temporalBasis;
              if(currentBasis&&historicalBasis&&currentBasis!==historicalBasis)continue;
              const pair={current:now[k].id,historical:b.id}, timing=order(pair);
              if(!chronologyCompatible([...previousOrders,...matched.map(order)],timing))continue;
              const mapped=extendNodes(nodes,now[k],b,current,historical);
              if(mapped)walk(k+1,mapped,[...matched,pair],new Set([...used,b.id]));
            }
          };
          walk(0,state.nodes,[],new Set());
          next.push(...local.sort((a,b)=>weight(b,current)-weight(a,current)).slice(0,6));
          if(visited>MAX_STATES)break;
        }
        if(visited>MAX_STATES)break;
      }
      if(visited>MAX_STATES)break;
    }
    const seen=new Set<string>();
    beam=next.sort((a,b)=>weight(b,current)-weight(a,current)||signature(a).localeCompare(signature(b))).filter(s=>{const key=signature(s);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,48);
  }
  for(const state of beam.sort((a,b)=>weight(b,current)-weight(a,current))){
    if(state.beats.length<2)continue;
    const nodes=[...state.nodes].map(([current,historical])=>({current,historical}));
    const candidate={version:2 as const,method:"ordered-relations-2" as const,nodes,beats:state.beats,counts:alignmentCounts(current,{nodes,beats:state.beats}),searchTruncated:truncated};
    try{return validateAlignment(candidate,current,historical);}catch{/* Reject incomplete or contradictory maps. */}
  }
  return null;
}
export function structuralWeight(alignment:StructuralAlignment,current:NarrativeEpisode){return alignment.counts.relations*10+alignment.counts.predicates*8+alignment.counts.beats*7-(current.beats.length-alignment.counts.currentBeats)*2;}
export function rankEpisodes<T extends {episode:NarrativeEpisode}>(current:NarrativeEpisode,candidates:T[]){return candidates.flatMap(candidate=>{const alignment=matchEpisodes(current,candidate.episode);return alignment?[{candidate,alignment,weight:structuralWeight(alignment,current)}]:[];}).sort((a,b)=>b.weight-a.weight||a.candidate.episode.id.localeCompare(b.candidate.episode.id));}
