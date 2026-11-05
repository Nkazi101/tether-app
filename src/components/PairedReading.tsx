import {historicalCaseTitle} from "../lib/historical-case-title";
import {EpisodeEvidence as Evidence} from "./EpisodeEvidence";
import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Check, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Comparison, EvidenceSource } from "../lib/comparison";
import type { NarrativeEpisode } from "../lib/episodes";
import type { IlluminationInput } from "../lib/paired-story";
import type { StoryImage } from "../lib/story-media";
import { StoryPhoto, browsePeriod, reportingSource } from "./StoryVisual";
import { useIllumination } from "../lib/comparison-client";
import {NarrativeText} from "./NarrativeText";
import { SharedNarrative } from "./SharedNarrative";


export function PairedOpening({ comparison, image }: { comparison: Comparison; image?: StoryImage | null }) {
  const pair = comparison.pairedStory!;
  const historicalImageSource = comparison.primary!.sources.find(s => s.image && s.image.kind !== "illustration");
  return <div className="pair-opening">
    <div className="pair-opening-now"><StoryPhoto image={image} source={reportingSource(comparison)} eager /><span className="pair-photo-label">Now · {browsePeriod(pair.current.period)}</span></div>
    <div className={`pair-opening-then ${historicalImageSource ? "has-photo" : ""}`}>
      {historicalImageSource && <StoryPhoto image={historicalImageSource.image!} source={historicalImageSource} eager />}
      <div><span className="pair-photo-label">Then · {browsePeriod(pair.historical.period)}</span><p className="pair-reference-actors">{pair.historical.actors.slice(0,2).map(a=>a.name).join(" · ")}</p><h2>{historicalCaseTitle(comparison.primary!)}</h2></div>
    </div>
  </div>;
}

export function CurrentReading({ comparison }: { comparison: Comparison }) {
  const source = reportingSource(comparison);
  return <div className="paired-reading current-reading">
    {source?.url && <a className="discovery-primary" href={source.url} target="_blank" rel="noreferrer">Read the original at {source.publisher} <ArrowUpRight size={16} /></a>}
    {comparison.currentEpisode && comparison.research?.currentReview === "model-checked" && <section className="current-sequence"><h2>What’s been reported</h2><ol>{comparison.currentEpisode.beats.map(beat => <li key={beat.id}><span>{beat.when}</span><p><NarrativeText text={beat.summary}/></p><Evidence episode={comparison.currentEpisode!} ids={beat.anchorIds} sources={comparison.sources} /></li>)}</ol></section>}
    <section className="current-search"><h2>The historical comparison is still open.</h2><p>This story hasn’t earned a published parallel yet. More evidence or a wider search may change that.</p><details className="pair-detail"><summary>What this investigation established <Plus size={18} /></summary><p>{comparison.research?.note || "No historical search is recorded for this version."}</p></details></section>
  </div>;
}

export function PairedReading({ comparison }: { comparison: Comparison }) {
  const pair = comparison.pairedStory!;
  const [explanationSeen, setExplanationSeen] = useState(false);
  const reading = useRef<HTMLElement>(null);
  useEffect(() => {
    setExplanationSeen(false);
    const target = reading.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setExplanationSeen(true); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [comparison.id]);
  const sourceSets = { now: comparison.sources, then: comparison.primary!.sources };
  const matchedNow = new Set(pair.alignment.beats.flatMap(row => row.currentBeatIds));
  const unmatched = pair.current.beats.filter(beat => !matchedNow.has(beat.id));
  return <div className="paired-reading">
    <header className="pair-intro"><h2>How the stories line up.</h2><p>A possible parallel, with sources at each step.</p></header>
    <div className="pair-column-titles" aria-hidden="true"><span>NOW · {browsePeriod(pair.current.period)}</span><span>THEN · {browsePeriod(pair.historical.period)}</span></div>
    <ol className="pair-beats">
      {pair.alignment.beats.map((row, index) => <li key={row.currentBeatIds.join(":")}>
        <span className="pair-step">{String(index + 1).padStart(2, "0")}</span>
        {([{ episode: pair.current, ids: row.currentBeatIds, sources: sourceSets.now, label: "Now" }, { episode: pair.historical, ids: row.historicalBeatIds, sources: sourceSets.then, label: "Then" }] as const).map(item => {
          return <section className="pair-beat" key={item.label} aria-label={`${item.label}, moment ${index + 1}`}>
            {item.ids.map(id => { const beat = item.episode.beats.find(b => b.id === id)!; return <div className="pair-action" key={id}>
            <p className="pair-beat-time"><span>{item.label} · </span>{beat.when}{beat.temporalBasis === "announced" ? " · announced" : ""}{beat.basis === "attributed-claim" ? " · attributed claim" : beat.basis === "reported-action" ? " · reported account" : ""}</p>
            <p><NarrativeText text={beat.summary}/></p><Evidence episode={item.episode} ids={beat.anchorIds} sources={item.sources} />
            </div>; })}
          </section>;
        })}
      </li>)}
    </ol>
    {unmatched.length > 0 && <details className="pair-detail pair-unmatched"><summary>Other reported developments ({unmatched.length}) <Plus size={18} /></summary><p>These moments weren’t used to support the comparison. That does not establish that they have no historical counterpart.</p>{unmatched.map(beat => <section key={beat.id}><h3>{beat.when}</h3><p><NarrativeText text={beat.summary}/></p><Evidence episode={pair.current} ids={beat.anchorIds} sources={sourceSets.now} /></section>)}</details>}
    <section className="pair-shared" ref={reading}><p className="discovery-eyebrow">A POSSIBLE READING</p><h2>What’s the same?</h2><p><NarrativeText text={pair.reading.shared.text}/></p></section>
    <SharedNarrative pair={pair} currentSources={sourceSets.now} historicalSources={sourceSets.then}/>
    <section className="pair-break"><p className="discovery-eyebrow">WHERE THE PARALLEL BREAKS</p><h2>What changes the comparison?</h2>
      {pair.reading.differences.map((difference, i) => <div key={i}>
        <div className="pair-different-facts"><section><h3>Now</h3><p><NarrativeText text={difference.now.text}/></p><Evidence episode={pair.current} ids={difference.now.anchorIds} sources={sourceSets.now} /></section><section><h3>Then</h3><p><NarrativeText text={difference.then.text}/></p><Evidence episode={pair.historical} ids={difference.then.anchorIds} sources={sourceSets.then} /></section></div>
        <p className="pair-implication"><NarrativeText text={difference.implication}/></p>
      </div>)}
    </section>
    {pair.reading.continuation && <section className="pair-continuation"><p className="discovery-eyebrow">HOW THE EARLIER STORY CONTINUED</p>
      {pair.reading.continuation.historicalBeatIds.map(id => { const beat = pair.historical.beats.find(b => b.id === id)!; return <div key={id}><h3>{beat.when}</h3><p><NarrativeText text={beat.summary}/></p><Evidence episode={pair.historical} ids={beat.anchorIds} sources={sourceSets.then} /></div>; })}
      {pair.reading.continuation.implication && <p className="pair-implication"><NarrativeText text={pair.reading.continuation.implication}/></p>}<span className="pair-small">One historical outcome is a possibility to examine, not a track record of what usually happens.</span>
    </section>}
    <details className="pair-detail"><summary>Another way to read these events <Plus size={18} /></summary><p><NarrativeText text={pair.reading.alternative.text}/></p>
      <div className="pair-different-facts"><Evidence episode={pair.current} ids={pair.reading.alternative.currentAnchorIds} sources={sourceSets.now} /><Evidence episode={pair.historical} ids={pair.reading.alternative.historicalAnchorIds} sources={sourceSets.then} /></div>
    </details>
    <details className="pair-detail"><summary>Who corresponds to whom, and why this case? <Plus size={18} /></summary>
      <dl className="pair-casting">{pair.alignment.nodes.filter(n => pair.current.actors.some(a => a.id === n.current)).map(node => <div key={node.current}><dt>{pair.current.actors.find(a => a.id === node.current)!.name}</dt><dd>{pair.historical.actors.find(a => a.id === node.historical)!.name}</dd></div>)}</dl>
      {pair.current.position && <p><strong>Today’s stage: </strong><NarrativeText text={pair.current.position.observation.text}/></p>}
      <p>{pair.selection.candidatesEncoded} encoded {pair.selection.candidatesEncoded === 1 ? "candidate" : "candidates"}; {pair.selection.candidatesMatched} passed the structural threshold. This pair uses {matchedNow.size} of {pair.current.beats.length} current moments, aligning {pair.alignment.counts.predicates} kinds of action in {pair.alignment.counts.beats} ordered groups. Adjacent moments can be grouped together; a known order cannot be reversed.</p>
      <p><NarrativeText text={pair.selection.note}/></p>{pair.alignment.searchTruncated && <p>The matcher reached its search bound. Other valid mappings may have been missed.</p>}
    </details>
    <Illumination key={comparison.id} id={comparison.id} explanationSeen={explanationSeen} />
  </div>;
}

export function Illumination({ id, explanationSeen,caseId }: { id: string; explanationSeen: boolean;caseId?:string }) {
  const feedback = useIllumination(id,caseId);
  const formId=useId();
  const [verdict, setVerdict] = useState<IlluminationInput["verdict"] | null>(null);
  const [pattern, setPattern] = useState("");
  const [reason, setReason] = useState<IlluminationInput["reason"]>(null);
  useEffect(() => {
    if (feedback.data) { setVerdict(feedback.data.verdict); setPattern(feedback.data.pattern); setReason(feedback.data.reason); }
    else { setVerdict(null); setPattern(""); setReason(null); }
  }, [feedback.data]);
  return <section className="pair-feedback" aria-labelledby={`${formId}-title`}><h2 id={`${formId}-title`}>Was this parallel useful?</h2>
    <div className="pair-verdicts">{([['helpful', 'Upvote'], ['unhelpful', 'Downvote']] as const).map(([value, label]) => <button key={value} type="button" disabled={feedback.isLoading || feedback.update.isPending} aria-pressed={verdict === value} onClick={() => { const next = verdict === value ? null : value; setVerdict(next); feedback.update.mutate(next ? { verdict: next, reason, pattern, explanationSeen } : null, { onError: () => setVerdict(feedback.data?.verdict || null) }); }}>{value === "helpful" ? <ThumbsUp size={17} /> : <ThumbsDown size={17} />}{label}</button>)}</div>
    {verdict && <details className="pair-feedback-note"><summary>Tell us why <span>Optional</span></summary><form onSubmit={e => { e.preventDefault(); feedback.update.mutate({ verdict, reason, pattern, explanationSeen }); }}>
      <label htmlFor={`${formId}-reason`}>What stood out?</label><select id={`${formId}-reason`} value={reason || ""} onChange={e => setReason((e.target.value || null) as IlluminationInput["reason"])}><option value="">Choose a reason</option><option value="structure">The shared pattern</option><option value="difference">The difference</option><option value="too-loose">The connection feels too loose</option><option value="unclear">The explanation is unclear</option><option value="source-issue">A source or factual issue</option></select>
      <label htmlFor={`${formId}-pattern`}>What do you see in these stories?</label><textarea id={`${formId}-pattern`} rows={3} maxLength={500} value={pattern} onChange={e => setPattern(e.target.value)} placeholder="In your own words…" />
      <button className="discovery-secondary" disabled={feedback.update.isPending}>Save note</button><p className="pair-small">Your note is private to Tether. Please leave out personal or sensitive information.</p>
    </form></details>}
    <div className="pair-feedback-status" role="status">{feedback.update.isSuccess && (feedback.data ? "Saved for this comparison version." : "Your feedback was deleted.")}</div>
    {(feedback.error || feedback.update.error) && <p role="alert">{(feedback.update.error || feedback.error)?.message}</p>}
    {feedback.data && <button className="pair-delete" disabled={feedback.update.isPending} onClick={() => feedback.update.mutate(null, { onSuccess: () => { setVerdict(null); setPattern(""); setReason(null); } })}>Delete my feedback</button>}
  </section>;
}
