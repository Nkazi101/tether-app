import type {
  ActorArchetypeSummary,
  DomainSlug,
  EventInterpretation,
  EventTypeSlug,
  MechanismSlug,
  OutcomeScenario,
} from "./archetypes";
import type { HistoricalArchiveLens, HistoricalArchiveScope } from "./pipeline";

export interface HistoricalParallel {
  id: string;
  title: string;
  historicalEvent: string;
  modernEvent: string;
  description: string;
  confidenceScore: number;
  tags: string[];
  sourceLabel?: string;
  evidenceTier?: "curated" | "discovery";
  analysisRunId?: string;
}

export interface HistoricalSearchQueryInterpretation {
  domainSlug: DomainSlug;
  eventTypeSlug: EventTypeSlug | null;
  mechanisms: MechanismSlug[];
  structuralSummary: string;
}

export interface HistoricalSearchResultSet {
  analysisRunId?: string;
  coverageScore: number;
  archiveScope?: HistoricalArchiveScope;
  archiveLenses?: HistoricalArchiveLens[];
  archiveGap: boolean;
  queryInterpretation?: HistoricalSearchQueryInterpretation | null;
  primaryResults: HistoricalParallel[];
  exploratoryResults: HistoricalParallel[];
  results: HistoricalParallel[];
}

export interface DeepDiveSource {
  label: string;
  kind: "current-reporting" | "historical-reference";
  url?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
}

export interface DeepDiveData {
  status: "ready" | "insufficient-match";
  pairState: "verified" | "emerging" | "archive-gap" | "current-event";
  whyThisPair: string;
  disanalogies: string[];
  alternativeParallels: Array<{
    title: string;
    reason: string;
  }>;
  confidenceScore: number | null;
  coverageScore: number | null;
  archiveScope?: HistoricalArchiveScope;
  archiveLenses?: HistoricalArchiveLens[];
  coreParallel: {
    title: string;
    tags: string[];
  };
  historical: {
    title: string;
    description: string;
    ripples: { title: string; description: string }[];
    ultimateOutcome: { title: string; description: string };
  };
  modern: {
    title: string;
    description: string;
    ripples: { title: string; description: string }[];
    projectedTrajectory: { title: string; description: string };
  };
  peopleInPlay: {
    eventArchetype: string;
    eventMeaning: string;
    actors: ActorArchetypeSummary[];
  };
  eventInterpretation?: EventInterpretation;
  outcomeScenarios?: OutcomeScenario[];
  sources?: DeepDiveSource[];
  aiInsight: string;
}

export interface FeedEcho {
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
  link?: string;
}

export interface CollectionData {
  featured: {
    title: string;
    description: string;
    imageUrl: string;
    volumeName: string;
  };
  filters: string[];
  volumes: {
    title: string;
    description: string;
    events: {
      tag: string;
      title: string;
      description: string;
      imageUrl: string;
    }[];
  }[];
}

export interface ExploreData {
  trendingTopics: string[];
  trendingArchetypes: {
    title: string;
    description: string;
  }[];
  aiSynthesisPulse: string;
  recommendedPathways: {
    type: "card" | "full";
    matchScore: string;
    archetype: string;
    title: string;
    description: string;
    echoesLinked: number;
    imageUrl: string;
  }[];
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Request failed");
  }

  return (await response.json()) as T;
}

export async function searchHistoricalParallels(query: string): Promise<HistoricalSearchResultSet> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      archiveGap: false,
      coverageScore: 0,
      archiveScope: undefined,
      archiveLenses: [],
      exploratoryResults: [],
      primaryResults: [],
      results: [],
    };
  }

  const data = await requestJson<HistoricalSearchResultSet>(
    `/api/explore/search?q=${encodeURIComponent(normalizedQuery)}`
  );
  return {
    analysisRunId: data.analysisRunId,
    archiveGap: Boolean(data.archiveGap),
    coverageScore: data.coverageScore || 0,
    archiveScope: data.archiveScope,
    archiveLenses: data.archiveLenses || [],
    queryInterpretation: data.queryInterpretation || null,
    primaryResults: data.primaryResults || data.results || [],
    exploratoryResults: data.exploratoryResults || [],
    results: data.results || data.primaryResults || [],
  };
}

export async function generateDeepDive(
  historicalEvent: string,
  modernEvent: string
): Promise<DeepDiveData> {
  return requestJson<DeepDiveData>(
    `/api/deep-dive?historicalEvent=${encodeURIComponent(historicalEvent)}&modernEvent=${encodeURIComponent(modernEvent)}`
  );
}

export async function fetchDynamicCollections(): Promise<CollectionData> {
  return requestJson<CollectionData>("/api/collections");
}

export async function fetchExploreRecommendations(): Promise<ExploreData> {
  return requestJson<ExploreData>("/api/explore");
}
