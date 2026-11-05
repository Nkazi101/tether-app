import {historicalCaseTitle,historicalCasePeriod} from "../lib/historical-case-title";
import React,{useEffect,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type{Comparison,EvidenceSource,HistoricalCase}from'../lib/comparison';
import type{NarrativeLens}from'../lib/narrative-comparison';
import{historicalResult}from'../lib/reading-trajectory';
import{NarrativeText}from'./NarrativeText';
import{ModelTerm}from'./ModelTerm';
import{Illumination}from'./PairedReading';

type Facts=NonNullable<Comparison['currentFrame']>['facts'];
const evidenceTierLabel:Record<Facts[number]['tier'],string>={reported:'Reported · source passage','attributed-claim':'Attributed claim · source passage',hearsay:'Unconfirmed account · source passage',opinion:'Opinion · source passage',satire:'Satire · source passage','historical-record':'Historical source passage'};
function EvidenceFacts({ids,facts,sources}:{ids:string[];facts:Facts;sources:EvidenceSource[]}){
 return <>{ids.map(id=>{const f=facts.find(f=>f.id===id)!;return <div key={id}><p><NarrativeText text={f.text}/></p><details className="pair-evidence"><summary>{evidenceTierLabel[f.tier]}<ChevronDown size={15} aria-hidden="true"/></summary>{f.evidence.map((e,i)=>{const s=sources.find(s=>s.id===e.sourceId)!;return <figure key={i}><blockquote>“{e.passage}”</blockquote><figcaption>{s.url?<a href={s.url} target="_blank" rel="noreferrer">{s.publisher} ↗</a>:s.publisher}</figcaption></figure>;})}</details></div>;})}</>;
}
function DynamicTestEvidence({dynamic,facts,sources}:{dynamic:NonNullable<Comparison['currentFrame']>['dynamics'][number];facts:Facts;sources:EvidenceSource[]}){
 const t=dynamic.test!;const observations=t.kind==='projection'?[['The accusation',t.accusation],['The mirrored conduct',t.mirroredConduct]] as const:t.kind==='inflation'?[['The claim of exceptional power',t.exceptionalIdentification],['The material limit',t.materialConstraint]] as const:[['The dominant attitude',t.dominantAttitude],['What it leaves out',t.neglectedOpposite],['The counterpressure',t.counterpressure]] as const;
 return <>{observations.map(([label,observation])=><section key={label}><h4>{label}</h4><p><NarrativeText text={observation.text}/></p><EvidenceFacts ids={observation.factIds} facts={facts} sources={sources}/></section>)}{t.kind==='projection'&&<p><strong>The quality in question: </strong><NarrativeText text={t.disownedQuality}/></p>}</>;
}
function ParallelReading({comparison:c,parallel,past,index}:{comparison:Comparison;parallel:NarrativeLens['parallels'][number];past:HistoricalCase;index:number}){
 const current=c.currentFrame!,record=past.narrativeRecord!,result=historicalResult(c,past.id);
 const [seen,setSeen]=useState(false),reading=useRef<HTMLOListElement>(null);
 useEffect(()=>{setSeen(false);const target=reading.current;if(!target)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setSeen(true);observer.disconnect();}},{threshold:0.2});observer.observe(target);return()=>observer.disconnect();},[c.id,past.id]);
 return <section className="context-parallel">
  <header><p className="discovery-eyebrow">{record.eventKind==='narrative-artifact'?'AN EARLIER TELLING':index?'A SECOND PERSPECTIVE':'THE HISTORICAL PARALLEL'} · {historicalCasePeriod(past)}</p><h2>{historicalCaseTitle(past)}</h2><p><NarrativeText text={parallel.why}/></p></header>
  <div className="pair-column-titles" aria-hidden="true"><span>NOW</span><span>THEN · {historicalCasePeriod(past)}</span></div>
  <ol className="pair-beats" ref={reading}>{parallel.correspondences.map((row,i)=><li key={i}>
   <span className="pair-step">{String(i+1).padStart(2,'0')}</span>
   <section className="pair-beat" aria-label={`Now, correspondence ${i+1}`}><p className="pair-beat-time">Now</p><EvidenceFacts ids={row.nowFactIds} facts={current.facts} sources={c.sources}/></section>
   <section className="pair-beat" aria-label={`Then, correspondence ${i+1}`}><p className="pair-beat-time">Then</p><EvidenceFacts ids={row.thenFactIds} facts={record.facts} sources={past.sources}/></section>
   <p className="context-rhyme"><NarrativeText text={row.reading}/></p>
  </li>)}</ol>
  {result&&index>0&&<section className="historical-result"><p className="discovery-eyebrow">{result.narrative?'THE ENDING IN THAT ACCOUNT':result.status==='unresolved'?'WHERE THAT CASE STOOD':'HOW IT TURNED OUT'} · {result.asOf}</p><h3>{result.narrative?'An ending in a story':result.status==='unresolved'?'The earlier case was still open.':'The result in that case'}</h3><p><NarrativeText text={result.text}/></p><details className="pair-evidence"><summary>Read the evidence for the result<ChevronDown size={15} aria-hidden="true"/></summary><EvidenceFacts ids={result.factIds} facts={record.facts} sources={past.sources}/></details></section>}
  <section className="pair-break"><p className="discovery-eyebrow">THE CONSEQUENTIAL DIFFERENCE</p><h3>What could change the path?</h3><p className="pair-implication"><NarrativeText text={parallel.difference.consequence}/></p><details className="pair-detail"><summary>Compare the difference<ChevronDown size={15} aria-hidden="true"/></summary><div className="pair-different-facts"><section><h4>Now</h4><EvidenceFacts ids={parallel.difference.nowFactIds} facts={current.facts} sources={c.sources}/></section><section><h4>Then</h4><EvidenceFacts ids={parallel.difference.thenFactIds} facts={record.facts} sources={past.sources}/></section></div></details></section>
  {result&&index===0&&<details className="pair-detail"><summary>Evidence for the earlier result<ChevronDown size={15} aria-hidden="true"/></summary><EvidenceFacts ids={result.factIds} facts={record.facts} sources={past.sources}/></details>}
  {parallel.continuation&&<p className="result-question"><NarrativeText text={parallel.continuation.implication}/></p>}
  {parallel.analogy&&<details className="pair-detail"><summary>Why these actors and this parallel?<ChevronDown size={15} aria-hidden="true"/></summary><p><NarrativeText text={parallel.analogy.sharedConstraint}/></p><p><NarrativeText text={parallel.analogy.sharedResponse}/></p><dl className="pair-casting">{parallel.analogy.mapping.map((m,i)=><div key={i}><dt>{m.now} ↔ {m.then}</dt><dd><NarrativeText text={m.sharedFunction}/></dd></div>)}</dl></details>}
  <Illumination id={c.id} caseId={past.id} explanationSeen={seen}/>
 </section>;
}
export function NarrativeReading({comparison:c,onFollow,following=false,followPending=false}:{comparison:Comparison;onFollow?:()=>void;following?:boolean;followPending?:boolean}){
 const current=c.currentFrame!,lens=c.narrativeLens!,cases=[c.primary!,...c.alternatives.map(a=>a.historicalCase)],result=historicalResult(c);
 // Older annotations without separate rhetoric/conduct support are not promoted
 // into the new visible dynamics treatment.
 const dynamics=current.dynamics.filter(d=>d.basis&&d.actors.length&&d.test);
 return <div className="paired-reading narrative-reading">
  <section className="narrative-payoff"><p className="discovery-eyebrow">A READING</p><h2><NarrativeText text={lens.insight.title}/></h2><p><NarrativeText text={lens.insight.text}/></p></section>
  {(result||lens.watch.length>0)&&<section className="story-trajectory" aria-label="The earlier result and today’s open question">
   {result&&<div className="trajectory-then"><p className="discovery-eyebrow">{result.narrative?"EARLIER TELLING":"THEN"} · {result.asOf}</p><h3>{historicalCaseTitle(c.primary!)}</h3><p><NarrativeText text={result.text}/></p></div>}
   {lens.watch[0]&&<div className="trajectory-now"><p className="discovery-eyebrow">NOW · THE QUESTION TO FOLLOW</p><h3><NarrativeText text={lens.watch[0].question}/></h3>{onFollow&&<button className="discovery-secondary trajectory-follow" onClick={onFollow} disabled={followPending} aria-pressed={following}>{following?"Following this comparison":"Follow this comparison"}</button>}</div>}
  </section>}
  {current.stage.stage!=='unclear'&&<p className="narrative-stage">This chapter: <ModelTerm term={current.stage.stage}/> · <NarrativeText text={current.stage.observation}/></p>}
  {lens.parallels.map((parallel,i)=><ParallelReading key={parallel.caseId} comparison={c} parallel={parallel} past={cases.find(h=>h.id===parallel.caseId)!} index={i}/>)}
  <section className="pair-shared"><p className="discovery-eyebrow">THE SHAPE THEY SHARE</p><p><NarrativeText text={lens.pattern}/></p></section>
  {dynamics.length>0&&<section className="beneath-conflict"><p className="discovery-eyebrow">BENEATH THE CONFLICT</p><h2>What’s driving the tension?</h2><div className="dynamic-readings">{dynamics.map((d,i)=><article key={i}><p className="dynamic-actors">{d.actors.join(' · ')}{d.target?` → ${d.target}`:''}</p><h3><ModelTerm term={d.dynamic}/></h3><p><NarrativeText text={d.observation}/></p><p className="dynamic-alternative"><strong>Another explanation: </strong><NarrativeText text={d.alternative}/></p><details className="pair-evidence"><summary>The observations behind this reading<ChevronDown size={15} aria-hidden="true"/></summary><p><NarrativeText text={d.basis!.relationship}/></p><DynamicTestEvidence dynamic={d} facts={current.facts} sources={c.sources}/></details></article>)}</div></section>}
  {current.cast.length>0&&<section className="narrative-cast"><h2>Who holds what power?</h2><div>{current.cast.map((role,i)=><article key={i}><h3>{role.actor}<span><ModelTerm term={role.figure}/></span></h3><p><NarrativeText text={role.observation}/></p><details className="pair-evidence"><summary>The role and the evidence<ChevronDown size={15} aria-hidden="true"/></summary><p><NarrativeText text={role.qualification}/></p><EvidenceFacts ids={role.factIds} facts={current.facts} sources={c.sources}/></details></article>)}</div></section>}
  <section className="narrative-rival"><p className="discovery-eyebrow">THE COMPETING READING</p><h2>What else could explain this?</h2><p><NarrativeText text={lens.rival.text}/></p><details className="pair-detail"><summary>What supports this alternative?<ChevronDown size={15} aria-hidden="true"/></summary><EvidenceFacts ids={lens.rival.currentFactIds} facts={current.facts} sources={c.sources}/><p><strong>The ordinary explanation: </strong><NarrativeText text={lens.routineExplanation}/></p><p><strong>What history adds: </strong><NarrativeText text={lens.valueAdd.reason}/></p></details></section>
  {lens.watch.length>1&&<section className="narrative-watch"><h2>Other developments to follow</h2>{lens.watch.slice(1).map((w,i)=><article key={i}><h3><NarrativeText text={w.question}/></h3><p><NarrativeText text={w.why}/></p></article>)}</section>}
  <details className="pair-detail narrative-source-type"><summary>The account, the sources and the limits<ChevronDown size={15} aria-hidden="true"/></summary><p><NarrativeText text={current.reason}/></p>{current.annotationReview&&<p><NarrativeText text={current.annotationReview.note}/></p>}{current.sourceNotes.map((n,i)=><p key={i}><NarrativeText text={n}/></p>)}{lens.limits.map((l,i)=><p key={i}><NarrativeText text={l}/></p>)}</details>
 </div>;
}
