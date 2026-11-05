import { getAuthHeaders } from "./auth-client";
import type { DomainSlug } from "./archetypes";

export interface HistoricalArchiveScope {
  retrievalMode: "corpus-wide-federated-scan";
  casesConsidered: number;
  structuredCases: number;
  casesWithOutcomes: number;
  casesWithArchetypes: number;
  domainsCovered: number;
  eventTypesCovered: number;
  mechanismsCovered: number;
  archetypesCovered: number;
  matchingDomains: number;
  matchingEventTypes: number;
  matchingMechanisms: number;
  matchingArchetypes: number;
  evidenceDepth: "thin" | "developing" | "broad";
}

export interface HistoricalEpisodeRecord {
  id: string;
  dataset: string;
  episode_key: string;
  title: string;
  summary: string;
  structural_pattern: string;
  archetype_slug: string | null;
  event_root_code: string | null;
  actor1_code: string | null;
  actor2_code: string | null;
  action_geo_country_code: string | null;
  start_date: string;
  end_date: string;
  member_count: number;
  total_events: number;
  total_articles: number;
  peak_articles: number;
  average_goldstein: number | null;
  evidence_score: number;
  source_completeness: "sampled" | "complete" | "unknown";
  status: "candidate" | "enriched" | "promoted" | "rejected";
  narrative_summary: string | null;
  outcome_summary: string | null;
  source_count: number;
  enrichment_score: number | null;
  promotion_eligible: boolean;
  sources?: HistoricalEpisodeSourceRecord[];
  rank: number;
}

export interface HistoricalEpisodeSourceRecord {
  id: string;
  episode_id: string;
  source_type: "wikipedia" | "wikidata" | "manual" | "other";
  source_title: string;
  source_url: string;
  source_excerpt: string | null;
  source_rank: number;
  retrieved_at: string;
}

export interface HistoricalEpisodeResponse {
  dataset: string;
  retrievalMode: "deterministic-episode-cluster";
  sourceCompleteness: "sampled" | "complete" | "unknown";
  caveat: string;
  query: string | null;
  episodeCount: number;
  episodes: HistoricalEpisodeRecord[];
}

export interface HistoricalArchiveLens {
  kind: "best-fit" | "same-domain" | "mechanism" | "archetype" | "cross-domain" | "counterexample";
  title: string;
  reason: string;
  candidateId: string;
  domainSlug: string | null;
  eventTypeSlug: string | null;
  structuralFitScore: number;
  confidenceScore: number;
}

export interface FeedRecord {
  id: string | number;
  modernTitle: string;
  historicalTitle: string;
  modernEvent: string;
  historicalEvent: string;
  description: string;
  structuralSkeleton?: string;
  imageUrl: string;
  imageAlt: string;
  highlight: string;
  layout: string;
  categorySlug?: DomainSlug | null;
  parallelState?: "verified" | "emerging" | "archive-gap" | "current-event";
  link?: string;
  sourceName?: string | null;
  publishedAt?: string | null;
  sourceCount?: number;
  providerCount?: number;
  providerNames?: string[];
  sourceLabels?: string[];
  dataOrigin?: "live" | "fallback";
  lastSeenAt?: string | null;
  corroborationSummary?: string;
  significanceScore?: number;
  coverageScore?: number;
  archiveScope?: HistoricalArchiveScope;
  confidenceScore?: number;
  archiveGap?: boolean;
  rationale?: string;
  disanalogyNote?: string | null;
  peopleSummary?: string | null;
  deepDiveReady?: boolean;
}

export interface SyncStatus {
  enabled: boolean;
  running: boolean;
  schedule: string | null;
  timezone: string | null;
  nextScheduledAt: string | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  lastTrigger: "manual" | "scheduled" | null;
  lastDurationMs: number | null;
}

export interface FeedResponse {
  feed: FeedRecord[];
  verified?: FeedRecord[];
  stream?: FeedRecord[];
  categories?: DomainSlug[];
  status?: "live" | "stale" | "empty";
  dataAsOf?: string | null;
  syncStatus?: SyncStatus;
}

export interface DailyEchoRecord {
  id?: string | number;
  modern_title: string;
  modern_description?: string;
  structural_skeleton?: string;
  archetype?: string;
  actors?: string[];
  historical_parallel: string;
  historical_description?: string;
  shadow_motive?: string;
}

export async function fetchLatestDailyEchoes() {
  const response = await fetch("/api/daily-echoes/latest");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to load the latest daily echoes");
  }

  const data = await response.json();
  return (data.echoes || []) as DailyEchoRecord[];
}

export async function fetchFeedRecords() {
  const response = await fetch("/api/feed");

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to load the feed");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Feed endpoint returned a non-JSON response");
  }

  const data = (await response.json()) as FeedResponse;
  return {
    feed: data.feed || data.verified || [],
    verified: data.verified || data.feed || [],
    stream: data.stream || [],
    categories: data.categories || [],
    status:
      data.status ||
      ((data.verified || data.feed || []).length > 0 || (data.stream || []).length > 0
        ? "live"
        : "empty"),
    dataAsOf: data.dataAsOf || null,
    syncStatus: data.syncStatus,
  } satisfies FeedResponse;
}

export async function fetchHistoricalEpisodes(query = "", limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("q", query.trim());

  const response = await fetch(`/api/historical-episodes?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to load historical episode clusters");
  }

  return (await response.json()) as HistoricalEpisodeResponse;
}

export async function processNewsPipeline() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/pipeline/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to run the news pipeline");
  }

  return response.json();
}
