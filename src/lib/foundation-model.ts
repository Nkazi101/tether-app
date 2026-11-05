import type {
  ActorArchetypeSummary,
  DomainSlug,
  EventTypeSlug,
  MechanismSlug,
  PersonaArchetypeSlug,
  StructuralRole,
} from "./archetypes";

export type {
  ActorArchetypeSummary,
  DomainSlug,
  EventTypeSlug,
  MechanismSlug,
  PersonaArchetypeSlug,
  StructuralRole,
} from "./archetypes";

export interface TaxonomyRecord {
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface EventTypeRecord extends TaxonomyRecord {
  family: string;
  domainSlug: DomainSlug | null;
}

export interface MechanismRecord extends TaxonomyRecord {
  family: string;
  slug: MechanismSlug;
}

export interface HistoricalCaseRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  yearLabel: string | null;
  domainSlug: DomainSlug | null;
  eventTypeSlug: EventTypeSlug | null;
  geography: string[];
  actorRoles: string[];
  structuralSummary: string | null;
  outcomeSummary: string | null;
  sourceQualityScore: number;
  caseConfidenceScore: number;
  metadata: Record<string, unknown>;
}

export interface CurrentEventRecord {
  id: string;
  slug: string;
  canonicalTitle: string;
  summary: string;
  status: "emerging" | "active" | "cooling" | "resolved" | "archived";
  domainSlug: DomainSlug | null;
  eventTypeSlug: EventTypeSlug | null;
  structuralSummary: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  articleCount: number;
  sourceCount: number;
  sourceDiversityScore: number;
  noveltyScore: number;
  analysisConfidenceScore: number;
  metadata: Record<string, unknown>;
}

export interface AnalysisRunRecord {
  id: string;
  requestedByUserId: string | null;
  currentEventId: string | null;
  inputMode: "current_event" | "ad_hoc_text" | "article_url" | "manual_pairing";
  queryText: string;
  domainSlug: DomainSlug | null;
  eventTypeSlug: EventTypeSlug | null;
  status: "queued" | "processing" | "completed" | "failed";
  coverageScore: number | null;
  archiveCandidateCount: number;
  selectedHistoricalCaseId: string | null;
  resultPayload: Record<string, unknown>;
  errorMessage: string | null;
}

export interface ParallelCandidateRecord {
  id: string;
  analysisRunId: string;
  historicalCaseId: string;
  rankOrder: number;
  retrievalMethod: string;
  structuralFitScore: number;
  coverageScore: number;
  sourceQualityScore: number;
  disanalogyPenalty: number;
  overallConfidenceScore: number;
  rationale: Record<string, unknown>;
}

export type ActorArchetypeRecord = ActorArchetypeSummary;
