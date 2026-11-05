import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Share2,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../components/AuthProvider";
import {
  EditorialImage,
  EvidenceBadge,
  PageHeading,
  LoadingState,
  EmptyState,
} from "../components/Editorial";
import { getPublicDomainLabel } from "../lib/archetypes";
import {
  useCurrentUserProfileQuery,
  useFeedQuery,
  useRunPipelineMutation,
  useSaveCurationMutation,
} from "../lib/queries";
import { appRoutes, buildAuthPath, buildDeepDivePath } from "../lib/routes";
import { type FeedRecord, type SyncStatus } from "../lib/pipeline";

interface FeedProps {
  onSelectParallel: (modern: string, historical: string) => void;
}
type FeedStrengthFilter =
  | "all"
  | "verified"
  | "emerging"
  | "archive-gap"
  | "current-event";
type FeedSort = "recommended" | "strongest" | "significance" | "newest";

const curatedEchoes: FeedRecord[] = [
  {
    id: 1,
    modernTitle: "Global Supply Chains Strain Under Geopolitical Shifts",
    historicalTitle: "The Bronze Age Collapse and Interconnected Fragility",
    modernEvent: "Global Supply Chains Strain Under Geopolitical Shifts",
    historicalEvent: "The Bronze Age Collapse and Interconnected Fragility",
    description:
      "The current fragility of global just-in-time manufacturing mirrors the structural vulnerabilities of the Late Bronze Age. Much like the reliance on tin and copper trade routes, today's geopolitical friction exposes how hyper-optimized systems fail catastrophically when a single node is disrupted.",
    imageUrl:
      "https://images.unsplash.com/photo-1755715367389-861e189b9e83?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Temple of Poseidon, used as conceptual historical imagery",
    highlight: "Late Bronze Age",
    layout: "full",
    categorySlug: "geopolitics",
    parallelState: "verified",
    significanceScore: 0.88,
    confidenceScore: 0.86,
    coverageScore: 0.82,
  },
  {
    id: 2,
    modernTitle: "Generative AI Disrupts Knowledge Economies",
    historicalTitle:
      "The Gutenberg Disruption and the Democratization of Authority",
    modernEvent: "Generative AI Disrupts Knowledge Economies",
    historicalEvent:
      "The Gutenberg Disruption and the Democratization of Authority",
    description:
      "This technological pivot reflects the 15th-century Printing Revolution. The sudden collapse of gatekeeper authority mirrors the clergy's loss of information control during the Reformation, signaling a shift from centralized truth to algorithmic distribution.",
    imageUrl:
      "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Newspapers illustrating the distribution of information",
    highlight: "Printing Revolution",
    layout: "split-reverse",
    categorySlug: "technology",
    parallelState: "verified",
    significanceScore: 0.84,
    confidenceScore: 0.83,
    coverageScore: 0.78,
  },
  {
    id: 3,
    modernTitle: "Climate-Driven Migration Strains Global Borders",
    historicalTitle: "The Völkerwanderung and the Transformation of Rome",
    modernEvent: "Climate-Driven Migration Strains Global Borders",
    historicalEvent:
      "The Migration Period (Völkerwanderung) and the Fall of Rome",
    description:
      "Modern mass migrations driven by climate change and resource scarcity closely parallel the Migration Period of Late Antiquity. Just as the movement of Germanic tribes reshaped the Roman Empire, today's demographic shifts are testing the resilience and adaptability of modern nation-states.",
    imageUrl:
      "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "People walking in a vast landscape",
    highlight: "Migration Period",
    layout: "split",
    categorySlug: "geopolitics",
    parallelState: "verified",
    significanceScore: 0.82,
    confidenceScore: 0.8,
    coverageScore: 0.76,
  },
  {
    id: 4,
    modernTitle: "The Privatization of Space Exploration",
    historicalTitle: "Charter Companies and the Age of Discovery",
    modernEvent: "The Privatization of Space Exploration",
    historicalEvent: "The Dutch East India Company and the Age of Discovery",
    description:
      "The reliance on private corporations like SpaceX for orbital logistics mirrors the 17th-century reliance on joint-stock companies like the VOC. Governments are once again outsourcing the massive risks of frontier exploration to private entities, blurring the lines between state power and corporate ambition.",
    imageUrl:
      "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Rocket launch",
    highlight: "joint-stock companies",
    layout: "split-reverse",
    categorySlug: "science",
    parallelState: "emerging",
    significanceScore: 0.78,
    confidenceScore: 0.68,
    coverageScore: 0.44,
  },
  {
    id: 5,
    modernTitle: "The Resurgence of Global Labor Movements",
    historicalTitle: "The Peasants' Revolt and Post-Plague Economics",
    modernEvent: "The Resurgence of Global Labor Movements",
    historicalEvent: "The Peasants' Revolt of 1381 and Post-Plague Economics",
    description:
      "Recent surges in unionization and labor strikes echo the economic restructuring following the Black Death. A sudden shift in labor supply dynamics empowers workers to demand better conditions, challenging entrenched economic hierarchies just as the 14th-century peasantry challenged feudalism.",
    imageUrl:
      "https://images.unsplash.com/photo-1503945438517-f65904a52ce6?q=80&w=1200&auto=format&fit=crop",
    imageAlt: "Crowd of people",
    highlight: "Black Death",
    layout: "full",
    categorySlug: "business",
    parallelState: "archive-gap",
    significanceScore: 0.76,
    confidenceScore: 0.54,
    coverageScore: 0.28,
    archiveGap: true,
  },
];

const strengthOptions: Array<{ value: FeedStrengthFilter; label: string }> = [
  { value: "all", label: "All States" },
  { value: "verified", label: "Stronger matches" },
  { value: "emerging", label: "Emerging connections" },
  { value: "archive-gap", label: "Limited evidence" },
  { value: "current-event", label: "Current reporting" },
];

const sortOptions: Array<{ value: FeedSort; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "strongest", label: "Strongest Match" },
  { value: "significance", label: "Most Significant" },
  { value: "newest", label: "Newest" },
];

function formatPublishedAt(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(parsed);
}

function formatCategoryLabel(value?: string | null) {
  return getPublicDomainLabel(value) || "General";
}

function getHistoricalParallelLabel(record: FeedRecord) {
  if (record.parallelState === "archive-gap") {
    return "Closest historical analog";
  }

  if (record.parallelState === "current-event") {
    return record.historicalTitle === "No stable archive analog yet"
      ? "Archive status"
      : "Nearest archive candidate";
  }

  return "Historical parallel";
}

function getWhyThisMatches(record: FeedRecord) {
  const source = (record.rationale || record.description || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!source) {
    return "This event shares structural pressure with the archived parallel.";
  }

  const firstSentence = source.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return firstSentence || source;
}

function formatSyncTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function describeNextSync(syncStatus?: SyncStatus | null) {
  if (!syncStatus) return "Sync schedule unavailable";
  if (syncStatus.running) return "Scheduled sync is running now";
  if (!syncStatus.enabled) return "Manual sync only";

  const nextRun = formatSyncTimestamp(syncStatus.nextScheduledAt);
  if (!nextRun) return "Next sync time unavailable";
  return `Next sync ${nextRun}`;
}

function describeLastSync(syncStatus?: SyncStatus | null) {
  if (!syncStatus) return null;
  if (syncStatus.running && syncStatus.lastStartedAt) {
    const startedAt = formatSyncTimestamp(syncStatus.lastStartedAt);
    return startedAt ? `Started ${startedAt}` : "Started recently";
  }

  const completedAt = formatSyncTimestamp(
    syncStatus.lastSucceededAt || syncStatus.lastCompletedAt,
  );
  if (!completedAt) return null;
  return `Last sync ${completedAt}`;
}

function filterFeedRecord(
  record: FeedRecord,
  category: string,
  strength: FeedStrengthFilter,
) {
  const categoryMatches =
    category === "all" || (record.categorySlug || "general") === category;
  const strengthMatches =
    strength === "all" || (record.parallelState || "verified") === strength;
  return categoryMatches && strengthMatches;
}

function sortFeedRecords(records: FeedRecord[], sortBy: FeedSort) {
  return [...records].sort((left, right) => {
    if (sortBy === "strongest") {
      return (right.confidenceScore || 0) - (left.confidenceScore || 0);
    }

    if (sortBy === "significance") {
      return (right.significanceScore || 0) - (left.significanceScore || 0);
    }

    if (sortBy === "newest") {
      const rightTime = right.publishedAt
        ? new Date(right.publishedAt).getTime()
        : 0;
      const leftTime = left.publishedAt
        ? new Date(left.publishedAt).getTime()
        : 0;
      return rightTime - leftTime;
    }

    const rightScore =
      (right.confidenceScore || 0) * 0.45 +
      (right.significanceScore || 0) * 0.3 +
      (right.coverageScore || 0) * 0.25;
    const leftScore =
      (left.confidenceScore || 0) * 0.45 +
      (left.significanceScore || 0) * 0.3 +
      (left.coverageScore || 0) * 0.25;
    return rightScore - leftScore;
  });
}

export function Feed({ onSelectParallel }: FeedProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileQuery = useCurrentUserProfileQuery(user?.id);
  const feedQuery = useFeedQuery();
  const saveMutation = useSaveCurationMutation(user?.id);
  const pipelineMutation = useRunPipelineMutation();
  const [category, setCategory] = useState("all");
  const [strength, setStrength] = useState<FeedStrengthFilter>("all");
  const [sort, setSort] = useState<FeedSort>("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [saved, setSaved] = useState<Set<string | number>>(new Set());
  const data = feedQuery.data;
  const live = [
    ...(data?.verified || data?.feed || []),
    ...(data?.stream || []),
  ];
  const examples = live.length === 0;
  const records = Array.from(
    new Map(
      (examples ? curatedEchoes : live).map((item) => [item.id, item]),
    ).values(),
  );
  const categories = Array.from(
    new Set(records.map((item) => item.categorySlug || "general")),
  ).sort();
  const filtered = sortFeedRecords(
    records.filter((item) => filterFeedRecord(item, category, strength)),
    sort,
  );
  const [lead, ...rest] = filtered;
  const fallbackOnly =
    examples || records.every((item) => item.dataOrigin === "fallback");
  const reset = () => {
    setCategory("all");
    setStrength("all");
    setSort("recommended");
    setVisibleCount(12);
  };

  const save = async (item: FeedRecord) => {
    if (!user) {
      showToast("Sign in to keep this parallel in your library.");
      navigate(
        buildAuthPath(
          buildDeepDivePath(
            item.modernEvent,
            item.historicalEvent,
            appRoutes.feed,
          ),
        ),
      );
      return;
    }
    try {
      await saveMutation.mutateAsync({
        modernTitle: item.modernTitle,
        historicalTitle: item.historicalTitle,
        modernEvent: item.modernEvent,
        historicalEvent: item.historicalEvent,
        description: item.description,
        imageUrl: item.imageUrl || "",
        link: item.link || "",
      });
      setSaved((current) => new Set(current).add(item.id));
      showToast("Added to your saved parallels.");
    } catch {
      showToast("Could not save this parallel. Please try again.");
    }
  };
  const share = async (item: FeedRecord) => {
    const url =
      window.location.origin +
      buildDeepDivePath(item.modernEvent, item.historicalEvent, appRoutes.feed);
    try {
      if (navigator.share)
        await navigator.share({ title: item.modernTitle, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("Comparison link copied.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        showToast("Could not share the link. Please try again.");
    }
  };
  const actions = (item: FeedRecord) => (
    <div className="story-actions">
      <button
        className="text-link"
        onClick={() => onSelectParallel(item.modernEvent, item.historicalEvent)}
      >
        Read the comparison <ArrowRight size={15} />
      </button>
      <div>
        {item.link && item.link !== "#" && (
          <a
            className="icon-button"
            href={item.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Read original reporting for ${item.modernTitle}`}
          >
            <ExternalLink size={15} />
          </a>
        )}
        <button
          className="icon-button"
          aria-label={
            saved.has(item.id)
              ? `Saved: ${item.modernTitle}`
              : `Save ${item.modernTitle}`
          }
          disabled={saveMutation.isPending || saved.has(item.id)}
          onClick={() => void save(item)}
        >
          {saved.has(item.id) ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
        <button
          className="icon-button"
          aria-label={`Share ${item.modernTitle}`}
          onClick={() => void share(item)}
        >
          <Share2 size={15} />
        </button>
      </div>
    </div>
  );
  const metadata = (item: FeedRecord) => (
    <div className="story-metadata">
      <span className="story-category">
        {formatCategoryLabel(item.categorySlug)}
      </span>
      <EvidenceBadge state={item.parallelState} />
      {(fallbackOnly || item.dataOrigin === "fallback") && (
        <span>Illustrative example</span>
      )}
    </div>
  );
  const connection = (item: FeedRecord, large = false) => (
    <div className="historical-connection">
      <span className="connection-glyph" aria-hidden="true" />
      <div>
        <p>{getHistoricalParallelLabel(item)}</p>
        {large ? (
          <h3>{item.historicalTitle}</h3>
        ) : (
          <h4>{item.historicalTitle}</h4>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="The daily perspective"
        title={
          <>
            Today, in <em>context.</em>
          </>
        }
        description="A moment to step back. Discover the historical patterns behind the stories shaping our world."
      >
        <p className="page-date">
          {new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/Chicago",
          }).format(new Date())}
        </p>
      </PageHeading>
      <section className="feed-toolbar" aria-label="Filter the daily feed">
        <div className="feed-topics">
          <div className="topic-list">
            {["all", ...categories].map((value) => (
              <button
                key={value}
                aria-pressed={category === value}
                onClick={() => {
                  setCategory(value);
                  setVisibleCount(12);
                }}
              >
                {value === "all"
                  ? "All perspectives"
                  : formatCategoryLabel(value)}
              </button>
            ))}
          </div>
          <button
            className="filter-toggle"
            aria-expanded={showFilters}
            aria-controls="feed-filter-options"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={14} /> Refine
            {strength !== "all" || sort !== "recommended" ? " ·" : ""}
          </button>
        </div>
        {showFilters && (
          <div className="filter-panel" id="feed-filter-options">
            <label>
              Evidence level
              <select
                value={strength}
                onChange={(e) => {
                  setStrength(e.target.value as FeedStrengthFilter);
                  setVisibleCount(12);
                }}
              >
                {strengthOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.value === "all"
                      ? "All evidence levels"
                      : option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as FeedSort)}
              >
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="text-link" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
      </section>
      <div className="feed-status" role="status">
        <p>
          {feedQuery.isLoading ? (
            "Gathering the latest available perspectives…"
          ) : fallbackOnly ? (
            <>
              <strong>From the example archive.</strong>{" "}
              {feedQuery.isError ? "Current reporting is unavailable. " : ""}
              These illustrative comparisons show how Tether works.
            </>
          ) : data?.status === "stale" ? (
            <>
              From the latest available edition
              {data.dataAsOf ? ` · ${formatSyncTimestamp(data.dataAsOf)}` : ""}.
              Reporting may have changed since this update.
            </>
          ) : (
            <>
              {filtered.length} perspectives
              {data?.dataAsOf
                ? ` · Updated ${formatSyncTimestamp(data.dataAsOf)}`
                : ""}
              . Connections are interpretations; read the differences alongside
              them.
            </>
          )}
        </p>
        <button
          disabled={feedQuery.isFetching}
          onClick={() => void feedQuery.refetch()}
          aria-label="Refresh available perspectives"
        >
          <RefreshCw
            size={12}
            className={feedQuery.isFetching ? "animate-spin" : ""}
          />{" "}
          Refresh
        </button>
      </div>
      {feedQuery.isLoading ? (
        <LoadingState label="Preparing your daily perspective…" />
      ) : (
        <div className="feed-grid">
          <div>
            {!lead ? (
              <EmptyState
                title="A quieter corner of the archive."
                description="No perspectives match these filters. Try a different topic or evidence level."
                action="Show all perspectives"
                onAction={reset}
              />
            ) : (
              <>
                <article className="lead-story lead-comparison">
                  <div className="story-copy">
                    {metadata(lead)}
                    <p className="eyebrow lead-now-label">Now / The story</p>
                    <h2>
                      <button
                        onClick={() =>
                          onSelectParallel(
                            lead.modernEvent,
                            lead.historicalEvent,
                          )
                        }
                      >
                        {lead.modernTitle}
                      </button>
                    </h2>
                    <p className="story-metadata">
                      {lead.sourceName ||
                        (fallbackOnly
                          ? "Tether example archive"
                          : "Current reporting")}
                      {formatPublishedAt(lead.publishedAt) &&
                        ` · ${formatPublishedAt(lead.publishedAt)}`}
                    </p>
                  </div>
                  <div className="lead-historical">
                    <p className="eyebrow">Then / A historical perspective</p>
                    <h3>{lead.historicalTitle}</h3>
                    <p className="story-rationale">{getWhyThisMatches(lead)}</p>
                    {lead.disanalogyNote && (
                      <p className="story-caveat">
                        <strong>Where it differs</strong>
                        <br />
                        {lead.disanalogyNote}
                      </p>
                    )}
                    <button
                      className="text-link"
                      onClick={() =>
                        onSelectParallel(lead.modernEvent, lead.historicalEvent)
                      }
                    >
                      Examine the evidence <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="lead-footer">{actions(lead)}</div>
                </article>
                <section className="stream-section">
                  <div className="section-heading">
                    <h2>More perspectives</h2>
                    <span>{rest.length} connections to explore</span>
                  </div>
                  {rest.slice(0, visibleCount).map((item) => (
                    <article
                      className={`story-row ${!item.imageUrl || item.imageUrl.includes("unsplash.com") ? "story-row-text" : ""}`}
                      key={item.id}
                    >
                      <div>
                        {metadata(item)}
                        <h3>
                          <button
                            onClick={() =>
                              onSelectParallel(
                                item.modernEvent,
                                item.historicalEvent,
                              )
                            }
                          >
                            {item.modernTitle}
                          </button>
                        </h3>
                        {connection(item)}
                        <p className="story-rationale">
                          {getWhyThisMatches(item)}
                        </p>
                        {item.disanalogyNote && (
                          <p className="story-caveat">{item.disanalogyNote}</p>
                        )}
                        <p className="story-metadata">
                          {item.sourceName ||
                            (fallbackOnly
                              ? "Tether example archive"
                              : "Current reporting")}
                          {formatPublishedAt(item.publishedAt) &&
                            ` · ${formatPublishedAt(item.publishedAt)}`}
                        </p>
                        {actions(item)}
                      </div>
                      {item.imageUrl &&
                        !item.imageUrl.includes("unsplash.com") && (
                          <EditorialImage
                            src={item.imageUrl}
                            alt={
                              item.imageAlt ||
                              `Reporting image accompanying ${item.modernTitle}`
                            }
                          />
                        )}
                    </article>
                  ))}
                  {rest.length > visibleCount && (
                    <div className="load-more">
                      <button
                        className="button-secondary"
                        onClick={() => setVisibleCount((count) => count + 12)}
                      >
                        Continue reading · {rest.length - visibleCount} more{" "}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
          <aside className="feed-sidebar">
            <section className="sidebar-note">
              <p className="eyebrow">A note on perspective</p>
              <h2>
                History rhymes.
                <br />
                Look for the differences.
              </h2>
              <p>
                A shared pattern is a starting point for understanding. Each
                comparison includes the limits of the analogy.
              </p>
              <Link className="text-link" to={appRoutes.collections}>
                Browse the collections <ArrowUpRight size={14} />
              </Link>
            </section>
            <section className="sidebar-search">
              <h3>
                What’s on
                <br />
                your mind?
              </h3>
              <p>
                Bring a headline. See where its story has echoes in the past.
              </p>
              <Link className="text-link" to={appRoutes.explore}>
                Explore a connection <ArrowRight size={15} />
              </Link>
            </section>
            <section className="evidence-guide">
              <p className="eyebrow">Reading the evidence</p>
              <div>
                <EvidenceBadge state="verified" />
                <p>A stronger structural match within the available archive.</p>
              </div>
              <div>
                <EvidenceBadge state="emerging" />
                <p>A useful lead that needs more support.</p>
              </div>
              <div>
                <EvidenceBadge state="archive-gap" />
                <p>
                  The archive has too little evidence for a strong comparison.
                </p>
              </div>
              <p className="search-helper">
                These labels describe the comparison, not the truth of the
                original reporting.
              </p>
            </section>
            {profileQuery.data?.role === "admin" && (
              <details className="archive-method">
                <summary>Edition administration</summary>
                <p>
                  {describeLastSync(data?.syncStatus)}
                  <br />
                  {describeNextSync(data?.syncStatus)}
                </p>
                <button
                  className="text-link"
                  disabled={pipelineMutation.isPending}
                  onClick={async () => {
                    try {
                      await pipelineMutation.mutateAsync();
                      showToast("Edition updated.");
                    } catch {
                      showToast("Could not update the edition.");
                    }
                  }}
                >
                  {pipelineMutation.isPending ? "Updating…" : "Run news sync"}
                </button>
              </details>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
