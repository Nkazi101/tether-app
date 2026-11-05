import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../components/AuthProvider";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { StoryImage } from "./story-media";
import { illuminationSchema, type IlluminationInput } from "./paired-story";

export function useIllumination(id: string,caseId?:string) {
  const { user } = useAuth();
  const client = useQueryClient();
  const queryKey = ["illumination", user?.id || "guest", id,caseId||"primary"];
  const query = useQuery({
    queryKey, enabled: Boolean(id), retry: 1,
    queryFn: async ({ signal }) => {
      const value = await comparisonRequest<{ feedback: unknown }>(`/analyses/${id}/illumination${caseId?`?case=${encodeURIComponent(caseId)}`:""}`, { signal });
      return value.feedback ? illuminationSchema.parse(value.feedback) : null;
    },
  });
  const update = useMutation({
    mutationFn: async (feedback: IlluminationInput | null) => {
      const value = await comparisonRequest<{ feedback: unknown }>(`/analyses/${id}/illumination${caseId?`?case=${encodeURIComponent(caseId)}`:""}`, { method: feedback ? "PUT" : "DELETE", ...(feedback ? { body: JSON.stringify(feedback) } : {}) });
      return value.feedback ? illuminationSchema.parse(value.feedback) : null;
    },
    onSuccess: value => client.setQueryData(queryKey, value),
  });
  return { ...query, update };
}
import {
  caseSchema,
  forecastSchema,
  validateComparison,
  type AnalysisJob,
  type AnalysisRequest,
  type ObservationInput,
  type ReadingItem,
  type HistoricalCase,
  type NewsTopic,
} from "./comparison";

export class ComparisonApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function useFeedImages() {
  return useQuery({
    queryKey: ["feed-images"],
    queryFn: ({ signal }) =>
      comparisonRequest<{ images: Record<string, StoryImage> }>("/media/feed", {
        signal,
      }),
    staleTime: 15 * 60000,
    retry: 1,
  });
}
export function useStoryImage(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["story-image", user?.id || "guest", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      comparisonRequest<{ image: StoryImage | null }>(`/analyses/${id}/media`, {
        signal: signal || AbortSignal.timeout(30000),
      }),
    staleTime: 3600000,
    retry: false,
  });
}
export async function comparisonRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await getSupabaseBrowserClient()?.auth.getSession();
  const token = session?.data.session?.access_token;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "same-origin",
      signal: init.signal || AbortSignal.timeout(15000),
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ComparisonApiError(
      "Tether could not be reached. Check your connection and try again.",
      0,
    );
  }
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ComparisonApiError(
      value.error || "This request could not be completed.",
      response.status,
    );
  return value as T;
}
const jobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  resultId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  resumeAt: z.string().nullable().optional(),
});
export function useCreateAnalysis() {
  return useMutation({
    mutationFn: async (input: AnalysisRequest) => {
      const result = await comparisonRequest<{ job: unknown }>("/analyses", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(input),
      });
      return jobSchema.parse(result.job);
    },
    retry: false,
  });
}
export function useAnalysisJob(id: string) {
  const { user } = useAuth();
  const client = useQueryClient();
  return useQuery<AnalysisJob>({
    queryKey: ["analysis-job", user?.id || "guest", id],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const job = jobSchema.parse(
        (await comparisonRequest<{ job: unknown }>(`/jobs/${id}`, { signal }))
          .job,
      );
      if (job.status === "succeeded")
        for (const name of [
          "reading-desk",
          "comparison-history",
          "browse-news",
          "browse-connections",
        ])
          void client.invalidateQueries({ queryKey: [name] });
      return job;
    },
    refetchInterval: (query) =>
      ["queued", "running"].includes(query.state.data?.status || "")
        ? query.state.data?.resumeAt && Date.parse(query.state.data.resumeAt) > Date.now() ? 60000 : 1500
        : false,
    retry: 1,
  });
}
export function useComparison(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comparison", user?.id || "guest", id],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const result = await comparisonRequest<{
        comparison: unknown;
        latestId: string;
        canRevise: boolean;
      }>(`/analyses/${id}`, { signal });
      return {
        comparison: validateComparison(result.comparison),
        latestId: result.latestId,
        canRevise: result.canRevise,
      };
    },
    staleTime: 60000,
    retry: false,
  });
}
export function usePublicReading() {
  return useQuery({
    queryKey: ["public-reading"],
    queryFn: async ({ signal }) => {
      const value = await comparisonRequest<{ items: ReadingItem[] }>(
        "/reading/public?examples=true",
        { signal },
      );
      return value.items.map((item) => ({
        ...item,
        comparison: validateComparison(item.comparison),
      }));
    },
    staleTime: 60000,
  });
}
export function useDiscoveryNews(enabled: boolean) {
  return useQuery({
    queryKey: ["discovery-news"], enabled,
    queryFn: async ({ signal }) => {
      const result = await comparisonRequest<{ items: ReadingItem[] }>("/reading/discover", { signal });
      return result.items.map(item => validateComparison(item.comparison));
    }, staleTime: 30000, refetchInterval: 60000,
  });
}
export function useBrowseNews(topic: NewsTopic | "all") {
  return useInfiniteQuery({
    queryKey: ["browse-news", topic],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (topic !== "all") params.set("topic", topic);
      if (pageParam) params.set("cursor", pageParam);
      const value = await comparisonRequest<{
        items: ReadingItem[];
        nextCursor: string | null;
        counts: Partial<Record<NewsTopic, number>>;
      }>(`/reading/public?${params}`, { signal });
      return {
        ...value,
        items: value.items.map((item) => ({
          ...item,
          comparison: validateComparison(item.comparison),
        })),
      };
    },
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
export function useBrowseConnections(topic: NewsTopic | "all") {
  return useQuery({
    queryKey: ["browse-connections", topic],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (topic !== "all") params.set("topic", topic);
      const value = await comparisonRequest<{ items: ReadingItem[] }>(
        `/reading/connections?${params}`,
        { signal },
      );
      return value.items
        .map((item) => validateComparison(item.comparison))
        .filter((item) => Boolean(item.primary))
        .slice(0, 24);
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
export function useBroaderResearch() {
  return useMutation({
    mutationFn: async (id: string) =>
      jobSchema.parse(
        (
          await comparisonRequest<{ job: unknown }>(
            `/analyses/${id}/research`,
            {
              method: "POST",
              headers: { "Idempotency-Key": crypto.randomUUID() },
              body: "{}",
            },
          )
        ).job,
      ),
    retry: false,
  });
}
export function useReadingDesk() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-desk", user?.id],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const result = await comparisonRequest<{ items: ReadingItem[] }>(
        "/reading",
        { signal },
      );
      return result.items.map((item) => ({
        ...item,
        comparison: validateComparison(item.comparison),
        savedComparison: item.savedComparison
          ? validateComparison(item.savedComparison)
          : null,
      }));
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}
export function useReadingUpdate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      situationId: string;
      following?: boolean;
      savedAnalysisId?: string | null;
      lastReadId?: string;
    }) => {
      const { situationId, ...patch } = input;
      return comparisonRequest(`/reading/${situationId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["reading-desk"] }),
  });
}
export function useObservation(situationId: string) {
  return useMutation({
    mutationFn: async (input: ObservationInput) =>
      jobSchema.parse(
        (
          await comparisonRequest<{ job: unknown }>(
            `/situations/${situationId}/observations`,
            {
              method: "POST",
              headers: { "Idempotency-Key": crypto.randomUUID() },
              body: JSON.stringify(input),
            },
          )
        ).job,
      ),
    retry: false,
  });
}
export function useComparisonHistory(situationId: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comparison-history", user?.id || "guest", situationId],
    enabled: Boolean(situationId) && enabled,
    queryFn: async ({ signal }) =>
      (
        await comparisonRequest<{ analyses: unknown[] }>(
          `/situations/${situationId}/history`,
          { signal },
        )
      ).analyses.map(validateComparison),
    staleTime: 10000,
  });
}
export function useArchive() {
  return useQuery({
    queryKey: ["reviewed-archive"],
    queryFn: async ({ signal }) =>
      (
        await comparisonRequest<{ cases: HistoricalCase[] }>("/archive", {
          signal,
        })
      ).cases.map((item) => caseSchema.parse(item)),
    staleTime: 300000,
  });
}
export function useForecasts(situationId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["forecasts", user?.id, situationId],
    enabled: Boolean(user) && enabled,
    queryFn: async ({ signal }) =>
      (
        await comparisonRequest<{ forecasts: unknown[] }>(
          `/situations/${situationId}/forecasts`,
          { signal },
        )
      ).forecasts.map((item) => forecastSchema.parse(item)),
  });
}


export function useResearchCoverage() {
  return useQuery({ queryKey:["research-coverage"], queryFn:({signal})=>comparisonRequest<{
    progress:{reportingStories:number;publishedComparisons:number;awaitingCurrentMethod:number;openAfterCurrentMethod:number;queuedInvestigations:number};
    canon:{edition:string;cases:number;regions:string[];domains:string[];oldestYear:number|null;newestYear:number|null;process:string};
    benchmark:{classification:string;cases:number;checks:number;passed:number;independentHistoricalAccuracy:null;limitations:string[]};
    grid?:import('./corpus-coverage').CorpusCoverage;
  }>("/coverage",{signal}),staleTime:60000,refetchInterval:60000,retry:1 });
}
