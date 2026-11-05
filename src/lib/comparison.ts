import {requiresCrossContextProof,currentEventYear} from './cross-context';
import { z } from "zod";
import {currentFrameSchema,historicalRecordSchema,narrativeLensSchema,validateFrame,validateHistoricalRecord,validateNarrativeLens} from './narrative-comparison';
import { episodeSchema, validateEpisode } from "./episodes";
import { pairedStorySchema, validatePairedStory } from "./paired-story";
import { storyImageSchema } from "./story-media";
import {
  narrativePlanSchema,
  storyLensSchema,
  validateNarrativePlan,
  validateStoryLenses,
} from "./story-lenses";

export const ENGINE_VERSION = "living-comparison-4";
export const topicNames = [
  "world",
  "politics",
  "business",
  "technology",
  "science",
  "health",
  "environment",
  "culture",
  "entertainment",
  "sports",
  "lifestyle",
  "general",
] as const;
export const topicSchema = z.enum(topicNames);
export type NewsTopic = z.infer<typeof topicSchema>;
export const topicLabels: Record<NewsTopic, string> = {
  world: "World",
  politics: "Politics",
  business: "Business",
  technology: "Technology",
  science: "Science",
  health: "Health",
  environment: "Environment",
  culture: "Culture",
  entertainment: "Entertainment",
  sports: "Sports",
  lifestyle: "Life",
  general: "Other stories",
};
const text = z.string().min(1).max(6000);
export const sourceSchema = z.object({
  id: z.string(),
  title: text,
  url: z
    .string()
    .url()
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Sources must use public http or https links.",
    )
    .nullable(),
  publisher: z.string(),
  publishedAt: z.string().nullable(),
  retrievedAt: z.string(),
  summary: z.string().min(1).max(12000),
  readingScope:z.string().max(400).optional(),
  captions:z.array(z.string().min(8).max(1000)).max(5).optional(),
  readSegments:z.array(z.string().min(8).max(12000)).min(1).max(3).optional(),
  kind: z.enum([
    "reporting",
    "historical-reference",
    "user-description",
    "illustration",
  ]),
  topic: topicSchema.optional(),
  image: storyImageSchema.optional(),
  exactPassages: z.array(z.string().min(8).max(300)).min(1).max(5).optional(),
  historicalProvenance: z.object({
    role: z.enum(["primary-record", "original-reporting", "original-analysis", "scholarly-history", "secondary", "unclear"]),
    note: z.string().min(15).max(500),
    basisPassage: z.string().max(300).nullable(),
    checkedBy: z.enum(["automated-triage", "agent-source-audit"]),
  }).optional(),
  retrieval: z
    .enum([
      "feed-excerpt",
      "article-text",
      "source-page",
      "source-summary",
      "reader-input",
    ])
    .optional(),
});
export type EvidenceSource = z.infer<typeof sourceSchema>;
export const signalNames = [
  "supply-dependence",
  "supply-disruption",
  "collective-bargaining",
  "work-stoppage",
  "gatekeeper-control",
  "enforcement-action",
  "information-distribution",
  "military-confrontation",
  "election-dispute",
] as const;
export const signalSchema = z.object({
  key: z.enum(signalNames),
  evidence: z.string().min(3).max(400),
  sourceId: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;
export const contextSchema = z.object({
  family: z.enum([
    "supply",
    "labor",
    "regulation",
    "information",
    "conflict",
    "politics",
    "unknown",
  ]),
  direction: z.enum(["developing", "reversing", "unclear"]),
  signals: z.array(signalSchema).max(9),
  actors: z
    .array(
      z.object({
        name: z.string().max(120),
        role: z.string().max(120),
        evidence: z.string().max(400),
        sourceId: z.string(),
      }),
    )
    .max(8),
  summary: z.string().max(1500),
  method: z.enum(["evidence-rules", "model-extraction"]),
});
export type EventContext = z.infer<typeof contextSchema>;
export const correspondenceSchema = z.object({
  relationship: text,
  presentEvidence: text,
  historicalEvidence: text,
  presentSourceId: z.string(),
  historicalSourceIds: z.array(z.string()).min(1),
});
export const indicatorSchema = z.object({
  id: z.string(),
  label: text,
  question: text,
  strengthens: text,
  weakens: text,
  sourceGuidance: text,
  horizonDays: z.number().int().min(1).max(730),
});
export type Indicator = z.infer<typeof indicatorSchema>;
export const caseSchema = z.object({
  narrativeRecord: historicalRecordSchema.optional(),
  curation: z.object({ edition: z.string(), regions: z.array(z.string()).min(1), domains: z.array(topicSchema).min(1), process: z.enum(["agent-source-audit","automated-source-review"]), independenceNote: z.string().min(20) }).optional(),
  episode: episodeSchema.nullable().default(null),
  id: z.string(),
  version: z.string(),
  title: text,
  period: text,
  family: contextSchema.shape.family,
  signals: z.array(z.enum(signalNames)),
  initialState: text,
  sequence: z.array(
    z.object({
      stage: text,
      description: text,
      sourceIds: z.array(z.string()),
    }),
  ),
  outcome: text.nullable(),
  boundaries: z.array(text),
  sources: z.array(sourceSchema),
  review: z.enum([
    "source-checked",
    "reference-only",
    "web-researched",
    "discovery",
  ]),
  reviewNote: text,
  narrative: z
    .object({
      title: text,
      interpretation: text,
      alternative: text,
      sourceIds: z.array(z.string()),
    })
    .nullable(),
});
export type HistoricalCase = z.infer<typeof caseSchema>;
export const researchSchema = z.object({
  version: z.string().default("web-research-1"),
  comparisonPolicy:z.literal("cross-context-1").optional(),
  temporalStage: z
    .enum(["developing", "retrospective", "unclear"])
    .default("unclear"),
  id: z.string().uuid(),
  status: z.enum(["searched", "limited", "unavailable"]),
  depth: z.number().int().min(1).max(3),
  searchedAt: z.string(),
  queries: z.array(z.string()).max(30),
  sourcesLocated: z.number().int(),
  sourcesRead: z.number().int(),
  readPages: z.array(z.object({ id: z.string(), title: z.string(), url: sourceSchema.shape.url, publisher: z.string() })).max(12).optional(),
  publicationStandard: z.literal("original-sources-1").optional(),
  sourceAcquisition: z.enum(["live-provider-search", "retained-provider-search", "agent-source-audit", "encoded-library"]).optional(),
  candidatesConsidered: z.array(z.string()).max(16),
  candidateChecks: z.array(z.object({ title: z.string().max(160), status: z.enum(["accepted", "rejected"]), reason: z.string().max(1000) })).max(12).optional(),
  reusedSourcesFrom: z.string().datetime().optional(),
  reusedEncodingFrom: z.string().uuid().optional(),
  optionalOmissions: z.array(z.object({ field: z.enum(["continuation", "continuation.implication"]), reason: z.string().max(600) })).max(2).optional(),
  sourcePunctuationRepairs: z.number().int().min(0).max(144).optional(),
  currentReview: z.enum(["model-checked", "agent-source-audit", "withheld"]).optional(),
  historicalReview: z.enum(["model-checked", "agent-source-audit", "withheld"]).optional(),
  historicalReviewIssues: z.array(z.string().max(600)).max(12).optional(),
  readingAuthor: z.enum(["model", "agent-editor"]).optional(),
  currentReviewIssues: z.array(z.string().max(600)).max(12).optional(),
  currentEvidenceFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  libraryCasesChecked: z.number().int().min(0).optional(),
  libraryEdition: z.string().optional(),
  reuseContext:z.object({headsScanned:z.number().int().nonnegative(),incomplete:z.boolean(),truncated:z.boolean(),repeated:z.array(z.object({title:z.string(),count:z.number().int().nonnegative()})).max(12)}).optional(),
  retrieval:z.object({channels:z.record(z.string(),z.number().int().nonnegative()),examined:z.number().int(),selected:z.number().int(),truncated:z.boolean()}).optional(),
  diversity:z.object({status:z.string(),caseId:z.string().nullable(),note:z.string()}).optional(),
  diagnostic: z.object({ stage: z.string().max(80), code: z.enum(["capacity", "network", "representation", "claims", "no-structural-match", "ineligible", "not-configured"]) }).optional(),
  frozenEpisodeHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  eventApplicability: z.enum(["eligible", "ineligible"]).optional(),
  model: z.string(),
  note: text,
  narrativePlan: narrativePlanSchema.nullable().default(null),
  assessmentAttempts: z.number().int().min(0).max(2).default(0),
  lensReview: z
    .enum(["not-needed", "model-checked", "withheld"])
    .default("not-needed"),
});
export type HistoricalResearch = z.infer<typeof researchSchema>;
export const comparisonSchema = z.object({
  currentFrame:currentFrameSchema.optional(),
  narrativeLens:narrativeLensSchema.optional(),
  currentEpisode: episodeSchema.nullable().default(null),
  pairedStory: pairedStorySchema.nullable().default(null),
  schemaVersion: z.literal(1),
  engineVersion: z.string(),
  id: z.string().uuid(),
  situationId: z.string().uuid(),
  archiveVersion: z.string().default("legacy-unversioned"),
  topic: topicSchema.default("general"),
  research: researchSchema.nullable().default(null),
  snapshotId: z.string().uuid(),
  previousId: z.string().uuid().nullable(),
  createdAt: z.string(),
  evidenceCutoff: z.string(),
  forkOriginId: z.string().uuid().nullable().default(null),
  title: text,
  inputMode: z.enum(["text", "article", "reporting", "walkthrough"]),
  state: z.enum([
    "supported",
    "partial",
    "insufficient-evidence",
    "needs-clarification",
  ]),
  summary: text,
  question: text,
  context: contextSchema,
  sources: z.array(sourceSchema),
  primary: caseSchema.nullable(),
  alternatives: z
    .array(z.object({ historicalCase: caseSchema, reason: text }))
    .max(3),
  correspondences: z.array(correspondenceSchema),
  differences: z.array(text),
  unknowns: z.array(text),
  indicators: z.array(indicatorSchema).max(4),
  scenarios: z.array(
    z.object({
      id: z.string(),
      title: text,
      condition: text,
      implication: text,
      indicatorIds: z.array(z.string()),
    }),
  ),
  narrative: z
    .object({
      title: text,
      interpretation: text,
      alternative: text,
      evidenceSourceIds: z.array(z.string()),
      status: z.literal("interpretation"),
    })
    .nullable(),
  lenses: z.array(storyLensSchema).max(2).default([]),
  scope: z.object({
    reviewedCases: z.number(),
    referenceCases: z.number(),
    considered: z.number(),
    note: text,
  }),
  change: z
    .object({
      summary: text,
      reasons: z.array(text),
      observationIds: z.array(z.string()),
    })
    .nullable(),
});
export type Comparison = z.infer<typeof comparisonSchema>;
export const analysisRequestSchema = z
  .object({
    input: z
      .string()
      .trim()
      .min(12, "Describe the event in a little more detail.")
      .max(12000, "Keep the description under 12,000 characters."),
    question: z
      .string()
      .trim()
      .min(5, "Describe the question in a little more detail.")
      .max(500)
      .default(
        "What does history help us understand, and what should we watch next?",
      ),
    situationId: z.string().uuid().optional(),
  })
  .strict();
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export const observationSchema = z
  .object({
    indicatorId: z.string().min(1).max(100),
    direction: z.enum(["strengthens", "weakens", "unclear", "retracted"]),
    text: z.string().trim().min(12).max(2000),
    sourceUrl: z.string().url().max(2000).optional(),
    observedAt: z.string().datetime(),
  })
  .strict();
export type ObservationInput = z.infer<typeof observationSchema>;
export interface Observation extends ObservationInput {
  id: string;
  createdAt: string;
  authorKind: "reader" | "reporting";
}
export const forecastRequestSchema = z
  .object({
    question: z.string().trim().min(15).max(500),
    criteria: z.string().trim().min(30).max(3000),
    resolutionSource: z.string().url().max(2000),
    closesAt: z.string().datetime(),
    probability: z.number().min(0).max(1),
    rationale: z.string().trim().min(10).max(2000),
  })
  .strict();
export const forecastSchema = z.object({
  id: z.string().uuid(),
  situationId: z.string().uuid(),
  question: text,
  criteria: text,
  resolutionSource: z.string().url(),
  closesAt: z.string(),
  createdAt: z.string(),
  outcome: z.union([z.literal(0), z.literal(1)]).nullable(),
  resolutionNote: z.string().nullable(),
  revisions: z
    .array(
      z.object({
        id: z.string().uuid(),
        probability: z.number().min(0).max(1),
        rationale: text,
        createdAt: z.string(),
      }),
    )
    .min(1),
});
export type Forecast = z.infer<typeof forecastSchema>;
export function brierScore(probability: number, outcome: 0 | 1) {
  return (probability - outcome) ** 2;
}
export interface AnalysisJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  resultId: string | null;
  error: string | null;
  createdAt: string;
  resumeAt?: string | null;
}
export interface ReadingItem {
  comparison: Comparison;
  savedComparison?: Comparison | null;
  savedAnalysisId?: string | null;
  following?: boolean;
  saved?: boolean;
  unread?: boolean;
}

export function validateComparison(value: unknown): Comparison {
  const result = comparisonSchema.parse(value);
  if(result.currentFrame)validateFrame(result.currentFrame,result.sources);
  if(result.primary?.narrativeRecord)validateHistoricalRecord(result.primary.narrativeRecord,result.primary.sources);
  if(result.narrativeLens){if(!result.currentFrame||!result.primary)throw new Error('A narrative comparison needs its source-only current frame and historical case.');result.narrativeLens=validateNarrativeLens(result.narrativeLens,result.currentFrame,[result.primary,...result.alternatives.map(a=>a.historicalCase)],requiresCrossContextProof(result),requiresCrossContextProof(result)?currentEventYear(result):undefined);}
  if (result.currentEpisode) validateEpisode(result.currentEpisode, result.sources);
  if (result.primary?.episode) validateEpisode(result.primary.episode, result.primary.sources);
  if (result.pairedStory) {
    if (!result.primary || JSON.stringify(result.primary.episode) !== JSON.stringify(result.pairedStory.historical))
      throw new Error("The aligned story must belong to the selected historical case.");
    validatePairedStory(result.pairedStory, result.sources, result.primary.sources);
    if (JSON.stringify(result.currentEpisode) !== JSON.stringify(result.pairedStory.current))
      throw new Error("The pair changed the frozen current episode.");
  }
  validateStoryLenses(
    result.lenses,
    result.sources,
    result.primary?.sources || [],
  );
  if (result.research?.narrativePlan)
    validateNarrativePlan(result.research.narrativePlan, result.sources);
  const ids = new Set(result.sources.map((source) => source.id));
  if (result.primary)
    result.primary.sources.forEach((source) => ids.add(source.id));
  result.alternatives.forEach((item) =>
    item.historicalCase.sources.forEach((source) => ids.add(source.id)),
  );
  const references = [
    ...result.context.signals.map((item) => item.sourceId),
    ...result.context.actors.map((item) => item.sourceId),
    ...result.correspondences.flatMap((item) => [
      item.presentSourceId,
      ...item.historicalSourceIds,
    ]),
    ...(result.narrative?.evidenceSourceIds || []),
    ...(result.primary?.sequence.flatMap((item) => item.sourceIds) || []),
  ];
  if (references.some((id) => !ids.has(id)))
    throw new Error("Comparison contains an unresolved evidence reference.");
  if (
    result.state === "supported" &&
    (!result.primary ||
      result.primary.review !== "source-checked" ||
      result.correspondences.length < 2 ||
      !result.differences.length)
  ) {
    throw new Error(
      "A supported comparison requires reviewed evidence and material differences.",
    );
  }
  return result;
}
