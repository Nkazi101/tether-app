import React from "react";
import {NarrativeText} from "./NarrativeText";
import {Link} from "react-router-dom";
import type {PairedStory} from "../lib/paired-story";
import {ModelTerm} from "./ModelTerm";
import type {ModelTermId} from "../lib/narrative-model";
import type {EvidenceSource} from "../lib/comparison";
import {EpisodeEvidence} from "./EpisodeEvidence";

export function SharedNarrative({pair,currentSources,historicalSources}:{pair:PairedStory;currentSources:EvidenceSource[];historicalSources:EvidenceSource[]}){
 const readings:Array<{term:ModelTermId;text:string;nowIds:string[];thenIds:string[];alternative:string}>=[];
 for(const role of pair.current.symbolic?.roles||[]){
  const mapped=pair.alignment.nodes.find(n=>n.current===role.actorId)?.historical;
  const counterpart=pair.historical.symbolic?.roles.find(r=>r.actorId===mapped&&r.figure===role.figure&&r.basis===role.basis);
  if(counterpart)readings.push({term:role.figure,text:`Now: ${role.observation.text} Then: ${counterpart.observation.text}`,nowIds:role.observation.anchorIds,thenIds:counterpart.observation.anchorIds,alternative:`Now: ${role.alternative} Then: ${counterpart.alternative}`});
 }
 for(const dynamic of pair.current.symbolic?.dynamics||[]){const counterpart=pair.historical.symbolic?.dynamics.find(d=>d.dynamic===dynamic.dynamic);if(counterpart)readings.push({term:dynamic.dynamic,text:`Now: ${dynamic.observation.text} Then: ${counterpart.observation.text}`,nowIds:dynamic.observation.anchorIds,thenIds:counterpart.observation.anchorIds,alternative:`Now: ${dynamic.alternative} Then: ${counterpart.alternative}`});}
 // A transparent legacy adapter: only matched, documented deception earns this
 // role reading. Authority alone never earns Tyrant, nor criticism Scapegoat.
 const deception=pair.alignment.beats.flatMap(group=>group.relations).find(map=>pair.current.relations.find(r=>r.id===map.current)?.predicate==='deceives'&&pair.historical.relations.find(r=>r.id===map.historical)?.predicate==='deceives');
 if(!readings.some(r=>r.term==='trickster')&&deception){readings.push({term:'trickster',text:'Both aligned accounts describe deception: one actor changes another’s choices by misleading them. Trickster names that narrative role; it is not a personality judgment.',nowIds:pair.current.relations.find(r=>r.id===deception.current)!.anchorIds,thenIds:pair.historical.relations.find(r=>r.id===deception.historical)!.anchorIds,alternative:'The operational methods may explain the event without a symbolic reading. This label adds no factual proof or forecast.'});}
 const arc=pair.current.symbolic?.arc;
 if(!readings.length&&(!arc||arc.stage==='unclear'))return <p className="pair-small"><Link to="/patterns">Explore the recurring cast, dynamics &amp; stages →</Link></p>;
 return <aside className="shared-narrative"><p className="discovery-eyebrow">NAMES FOR THE PATTERN · A READING</p>{readings.slice(0,2).map((r,i)=><div key={`${r.term}:${i}`}><ModelTerm term={r.term}/><p><NarrativeText text={r.text}/></p><details className="pair-detail"><summary>Evidence &amp; another reading</summary><div className="pair-different-facts"><EpisodeEvidence episode={pair.current} ids={r.nowIds} sources={currentSources}/><EpisodeEvidence episode={pair.historical} ids={r.thenIds} sources={historicalSources}/></div><p><NarrativeText text={r.alternative}/></p></details></div>)}{arc&&arc.stage!=='unclear'&&<p>Today’s stage: <ModelTerm term={arc.stage}/> <NarrativeText text={arc.observation.text}/></p>}<Link to="/patterns">Meet the recurring figures, dynamics &amp; stages →</Link></aside>;
}
