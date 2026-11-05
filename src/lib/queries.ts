import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCuration,
  deleteCuration,
  fetchCurations,
  type SaveCurationInput,
} from "./curations";
import {
  fetchDynamicCollections,
  fetchExploreRecommendations,
  generateDeepDive,
  searchHistoricalParallels,
} from "./muse";
import { fetchFeedRecords, fetchHistoricalEpisodes, processNewsPipeline } from "./pipeline";
import { fetchCurrentUserProfile, saveUserPreferences, type UserPreferences } from "./profile";

export const queryKeys = {
  profile: (userId?: string | null) => ["profile", userId || "guest"] as const,
  feed: ["feed", "cards"] as const,
  explore: ["explore", "snapshot"] as const,
  collections: ["collections", "snapshot"] as const,
  curations: (userId?: string | null) => ["curations", userId || "guest"] as const,
  deepDive: (historicalEvent: string, modernEvent: string) =>
    ["deep-dive", historicalEvent, modernEvent] as const,
  exploreSearch: (query: string) => ["explore-search", query.trim().toLowerCase()] as const,
  historicalEpisodes: (query: string) => ["historical-episodes", query.trim().toLowerCase()] as const,
};

export function useCurrentUserProfileQuery(userId?: string | null) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: fetchCurrentUserProfile,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useSaveUserPreferencesMutation(userId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      eventArchetypeSlugs: string[];
      preferredDomains?: string[];
      analysisDepth?: UserPreferences['analysis_depth'];
    }) => saveUserPreferences(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}

export function invalidateHistoryViews(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.feed }),
    queryClient.invalidateQueries({ queryKey: queryKeys.explore }),
    queryClient.invalidateQueries({ queryKey: queryKeys.collections }),
  ]);
}

export function useFeedQuery() {
  return useQuery({
    queryKey: queryKeys.feed,
    queryFn: fetchFeedRecords,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useExploreDataQuery() {
  return useQuery({
    queryKey: queryKeys.explore,
    queryFn: fetchExploreRecommendations,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useCollectionsQuery() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: fetchDynamicCollections,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useHistoricalSearchQuery(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.exploreSearch(normalizedQuery),
    queryFn: () => searchHistoricalParallels(normalizedQuery),
    enabled: normalizedQuery.length > 0,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useHistoricalEpisodesQuery(query = "") {
  return useQuery({
    queryKey: queryKeys.historicalEpisodes(query),
    queryFn: () => fetchHistoricalEpisodes(query, 8),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}

export function useDeepDiveQuery(historicalEvent: string, modernEvent: string) {
  return useQuery({
    queryKey: queryKeys.deepDive(historicalEvent, modernEvent),
    queryFn: () => generateDeepDive(historicalEvent, modernEvent),
    enabled: Boolean(historicalEvent && modernEvent),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCurationsQuery(userId?: string | null) {
  return useQuery({
    queryKey: queryKeys.curations(userId),
    queryFn: fetchCurations,
    enabled: Boolean(userId),
    staleTime: 30_000,
    gcTime: 30 * 60_000,
  });
}

export function useSaveCurationMutation(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCurationInput) => createCuration(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.curations(userId) });
    },
  });
}

export function useDeleteCurationMutation(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCuration(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.curations(userId) });
    },
  });
}

export function useRunPipelineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processNewsPipeline,
    onSuccess: async () => {
      await invalidateHistoryViews(queryClient);
    },
  });
}
