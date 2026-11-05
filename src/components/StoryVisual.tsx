import {historicalCaseTitle,historicalCasePeriod} from "../lib/historical-case-title";
import {historicalResult,hasHistoricalReading} from "../lib/reading-trajectory";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Link2 } from "lucide-react";
import type { Comparison, EvidenceSource } from "../lib/comparison";
import { topicLabels } from "../lib/comparison";
import { safeImageUrl, type StoryImage } from "../lib/story-media";

export const shortText = (value: string, max = 160) => {
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
};
export const openingText = (value: string, max = 260) => {
  const clean = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const first = clean.match(/^(.{60,}?[.!?])(?:\s|$)/)?.[1];
  return first && first.length <= max ? first : shortText(clean, max);
};
export const sentenceCase = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : value;
export function browsePeriod(value: string) {
  const dates = value.match(
    /^(\d{4})-\d{2}-\d{2}(?:\s*(?:to|[–—-])\s*(\d{4})-\d{2}-\d{2})?$/i,
  );
  if (!dates) return value;
  return !dates[2] || dates[1] === dates[2]
    ? dates[1]
    : `${dates[1]}–${dates[2]}`;
}
export const reportingSource = (story: Comparison) =>
  story.sources.find((s) => s.kind === "reporting") || story.sources[0];

/** Counts describe the supplied account, never independently confirmed truth. */
export function currentAccountEvidenceLabel(story: Comparison) {
  const facts = story.currentFrame?.facts;
  const sourceIds = new Set(
    facts
      ? facts.flatMap(fact => fact.evidence.map(evidence => evidence.sourceId))
      : story.sources.filter(source => source.kind !== "illustration").map(source => source.id),
  );
  const count = new Set(story.sources.filter(source => source.kind !== "illustration" && sourceIds.has(source.id)).map(source => source.id)).size;
  const sources = `${count} current ${count === 1 ? "source" : "sources"}`;
  if (!facts?.length) return sources;
  const tiers = [
    ["reported", "reported", "reported"],
    ["attributed-claim", "attributed claim", "attributed claims"],
    ["hearsay", "unconfirmed account", "unconfirmed accounts"],
    ["opinion", "opinion", "opinions"],
    ["satire", "satirical observation", "satirical observations"],
    ["historical-record", "historical observation", "historical observations"],
  ] as const;
  const breakdown = tiers.flatMap(([tier, singular, plural]) => {
    const count = facts.filter(fact => fact.tier === tier).length;
    return count ? [`${count} ${count === 1 ? singular : plural}`] : [];
  });
  return `${facts.length} ${facts.length === 1 ? "observation" : "observations"} · ${sources} · ${breakdown.join(", ")}`;
}
// Label only explicit publisher URL conventions; unknown genre stays unclassified.
export function storyGenre(source?: EvidenceSource): string | null {
  const path = source?.url ? new URL(source.url).pathname : "";
  if (/\/(?:commentisfree|opinion)(?:\/|$)/i.test(path)) return "Opinion";
  if (/\/(?:reviews?)(?:\/|-|$)/i.test(path) || /-review(?:-|$)/i.test(path)) return "Review";
  if (/\/(?:live)(?:\/|$)/i.test(path)) return "Live coverage";
  if (/\/(?:analysis)(?:\/|$)/i.test(path)) return "Analysis";
  return null;
}
export function canonicalMediaKey(value: string) {
  try {
    const url = new URL(value.replace(/&amp;/g, "&"));
    for (const key of [...url.searchParams.keys()])
      if (/^(?:amp;)*(utm_|at_|fbclid|gclid)/i.test(key))
        url.searchParams.delete(key);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
}
export function findStoryImage(
  story: Comparison,
  images: Record<string, StoryImage> = {},
) {
  const source = reportingSource(story);
  return (
    source?.image ||
    (source?.url ? images[canonicalMediaKey(source.url)] : undefined)
  );
}
export function StoryPhoto({
  image,
  source,
  eager = false,
  className = "",
}: {
  image?: StoryImage | null;
  source?: EvidenceSource;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image?.url]);
  const usable = image && safeImageUrl(image.url) && !failed;
  return (
    <figure className={`story-photo ${className}`}>
      {usable ? (
        <img
          src={image.url}
          alt={image.alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="story-photo-empty">
          <Link2 size={48} strokeWidth={1} />
          <span>{source?.publisher || "A story to explore"}</span>
        </div>
      )}
      {usable && (
        <figcaption>
          <span>
            {(image.kind === "illustration" || /^Illustration\b/i.test(image.credit))
              ? "Illustration"
              : image.kind === "archive"
                ? "Archive image"
                : "Article image"}{" "}
            · {image.credit}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
export function ConnectionCard({
  story,
  image,
}: {
  story: Comparison;
  image?: StoryImage;
}) {
  const source = reportingSource(story);
  return (
    <article className="discovery-card">
      <Link
        className="discovery-card-link"
        to={`/comparisons/${story.id}`}
        aria-label={`Explore: ${story.title}`}
      >
        <StoryPhoto image={image} source={source} />
        <div className="discovery-card-copy">
          <div className="story-kicker">
            <span>{topicLabels[story.topic]}{storyGenre(source) ? ` · ${storyGenre(source)}` : ""}</span>
            <span>
              {source?.publishedAt
                ? new Date(source.publishedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Date unconfirmed"}
            </span>
          </div>
          <h3>{story.title}</h3>
          <p className="card-excerpt">{openingText(source?.summary || story.context.summary, 145)}</p>
          {hasHistoricalReading(story)&&story.narrativeLens&&<p className="card-insight"><span>A reading</span>{story.narrativeLens.insight.title}</p>}
          {hasHistoricalReading(story) && story.primary ? (
            <div className="card-then">
              <div>
                <span title={historicalCasePeriod(story.primary)}>
                  {"THEN · "}
                  {browsePeriod(historicalCasePeriod(story.primary))}
                </span>
                {story.pairedStory&&<p>{story.pairedStory.historical.actors.slice(0,2).map(a=>a.name).join(" · ")}</p>}
                <p>{shortText(historicalCaseTitle(story.primary), 105)}</p>{historicalResult(story)&&<p className="card-outcome">{shortText(historicalResult(story)!.text,130)}</p>}
                {story.narrativeLens?.watch[0]&&<p className="card-open-question"><span>The open question</span>{shortText(story.narrativeLens.watch[0].question,150)}</p>}
              </div>
            </div>
          ) : <p className="card-source">{source?.publisher || "Reader submission"}</p>}
          <span className="card-cta">
            {hasHistoricalReading(story) ? "See how today compares" : "Read the story"}
            <ArrowUpRight size={18} />
          </span>
        </div>
      </Link>
    </article>
  );
}
