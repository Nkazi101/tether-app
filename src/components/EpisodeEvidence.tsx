import React from "react";
import {ArrowUpRight,Plus} from "lucide-react";
import type {NarrativeEpisode} from "../lib/episodes";
import type {EvidenceSource} from "../lib/comparison";
export function EpisodeEvidence({ episode, ids, sources }: { episode: NarrativeEpisode; ids: string[]; sources: EvidenceSource[] }) {
  const anchors = [...new Set(ids)].map(id => episode.anchors.find(a => a.id === id)!);
  return <details className="pair-evidence"><summary>Evidence <Plus size={13} /></summary>
    {anchors.map(anchor => {
      const source = sources.find(s => s.id === anchor.sourceId)!;
      return <figure key={anchor.id}><blockquote>“{anchor.passage}”</blockquote><figcaption>
        {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} <ArrowUpRight size={12} /></a> : source.publisher}
      {source.retrieval === "source-summary" && <span className="pair-source-limit">Checked excerpt. Sources &amp; limits contains a labelled research summary and its access limitations.</span>}
      </figcaption></figure>;
    })}
  </details>;
}

