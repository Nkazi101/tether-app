import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", override: true });
dotenv.config();

const DEFAULT_DATASET = "gdelt-1.0-reduced-sample-1000";
const DEFAULT_MAX_EPISODES = 100;
const DEFAULT_SEARCH_RESULTS = 3;
const DEFAULT_DELAY_MS = 1000;
const WIKIMEDIA_ACTION_URL = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  "Tether/0.1 (historical research; local development; contact unavailable)";

type EnrichmentOptions = {
  mode: "dry-run" | "import";
  dataset: string;
  maxEpisodes: number;
  searchResults: number;
  delayMs: number;
  recheck: boolean;
};

type EpisodeRow = {
  id: string;
  dataset: string;
  title: string;
  summary: string;
  structural_pattern: string;
  archetype_slug: string | null;
  actor1_code: string | null;
  actor2_code: string | null;
  event_root_code: string | null;
  start_date: string;
  end_date: string;
  member_count: number;
  total_articles: number;
  evidence_score: number;
  status: "candidate" | "enriched" | "promoted" | "rejected";
  metadata: Record<string, unknown> | null;
};

type WikiSearchPage = {
  id: number;
  index?: number;
  title: string;
  description?: string;
  excerpt?: string;
  extract?: string;
  fullurl?: string;
};

type EnrichedEpisode = {
  episode: EpisodeRow;
  searchQuery: string;
  source: WikiSearchPage | null;
  sourceRank: number | null;
  narrativeSummary: string | null;
  outcomeSummary: string | null;
  enrichmentScore: number;
  promotionEligible: boolean;
  metadata: Record<string, unknown>;
};

const ACTOR_ALIASES: Record<string, string> = {
  AFG: "Afghanistan",
  AUS: "Australia",
  BGR: "Bulgaria",
  CHE: "Switzerland",
  CHN: "China",
  COL: "Colombia",
  CZE: "Czech Republic",
  DEU: "Germany",
  EGY: "Egypt",
  ESP: "Spain",
  FRA: "France",
  GBR: "United Kingdom",
  GEO: "Georgia",
  IND: "India",
  IRN: "Iran",
  IRQ: "Iraq",
  ISR: "Israel",
  JPN: "Japan",
  KOR: "South Korea",
  LBY: "Libya",
  MEX: "Mexico",
  NATO: "NATO",
  NGA: "Nigeria",
  PAK: "Pakistan",
  PSE: "Palestine",
  RUS: "Russia",
  SAU: "Saudi Arabia",
  SOM: "Somalia",
  SSD: "South Sudan",
  SYR: "Syria",
  TUR: "Turkey",
  UKR: "Ukraine",
  USA: "United States",
  VEN: "Venezuela",
  VNM: "Vietnam",
  YEM: "Yemen",
  ZAF: "South Africa",
  ZWE: "Zimbabwe",
  AFR: "Africa",
  BUS: "business",
  CIV: "civilians",
  CVL: "civilians",
  EDU: "education",
  GOV: "government",
  IGO: "international organization",
  MED: "medical sector",
  MIL: "military",
  REF: "refugees",
  UAF: "armed forces",
};

const EVENT_FAMILY_ALIASES: Record<string, string> = {
  "01": "public statement",
  "02": "appeal",
  "03": "cooperation",
  "04": "political negotiations",
  "05": "diplomatic cooperation",
  "06": "material cooperation",
  "07": "aid",
  "08": "ceasefire agreement",
  "09": "investigation",
  "10": "demand",
  "11": "disapproval",
  "12": "rejection",
  "13": "threat",
  "14": "protest movement",
  "15": "military posture",
  "16": "reduced relations",
  "17": "coercion",
  "18": "assault",
  "19": "war conflict",
  "20": "mass violence",
};

const EVENT_FAMILY_TERMS: Record<string, string[]> = {
  "01": ["statement", "speech", "declaration", "address"],
  "02": ["appeal", "call", "request", "plea"],
  "03": ["cooperation", "collaboration", "partnership", "agreement"],
  "04": ["negotiat", "consult", "agreement", "constitution", "politic"],
  "05": ["diplomatic", "relations", "treaty", "agreement"],
  "06": ["aid", "assistance", "support", "cooperation"],
  "07": ["aid", "assistance", "humanitarian", "relief", "intervention"],
  "08": ["ceasefire", "agreement", "yield", "concession", "settlement"],
  "09": ["investigation", "inquiry", "probe", "commission"],
  "10": ["demand", "request", "ultimatum", "call"],
  "11": ["condemn", "disapproval", "criticism", "sanction"],
  "12": ["rejection", "refusal", "denied", "veto"],
  "13": ["threat", "warning", "ultimatum"],
  "14": ["protest", "uprising", "demonstration", "movement"],
  "15": ["military", "troop", "deployment", "exercise", "mobilization"],
  "16": ["relations", "diplomatic", "expelled", "recall", "embassy"],
  "17": ["coercion", "sanction", "pressure", "blockade", "force"],
  "18": ["attack", "assault", "invasion", "strike", "offensive"],
  "19": ["war", "conflict", "battle", "military", "fight", "revolution", "rebellion", "uprising"],
  "20": ["massacre", "violence", "genocide", "atrocity", "mass killing"],
};

const OUTCOME_PATTERN =
  /\b(ended(?: with| in)?|ending|culminated in|concluded with|led to (?:the )?(?:establishment|creation|formation)|resulted in|resulting in|(?:an?|the) (?:agreement|treaty) (?:was )?(?:signed|reached|concluded|ratified)|(?:an?|the) (?:ceasefire|armistice) (?:was )?(?:signed|reached|declared|agreed)|surrendered|defeated|overthrew|gained independence|declared independence|dissolved|collapsed|withdrew|annexed|established (?:a|an|the) (?:new|autonomous|independent|government|state|administration)|won (?:a |the )?victory|suffered (?:a |the )?defeat)\b/i;

function parseArgs(argv: string[]): EnrichmentOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      values.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else {
      values.set(key, "true");
    }
  }

  const positive = (key: string, fallback: number) => {
    const value = Number.parseInt(values.get(key) || "", 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  return {
    mode: values.get("mode") === "import" ? "import" : "dry-run",
    dataset: values.get("dataset") || DEFAULT_DATASET,
    maxEpisodes: Math.min(500, positive("max-episodes", DEFAULT_MAX_EPISODES)),
    searchResults: Math.min(5, positive("search-results", DEFAULT_SEARCH_RESULTS)),
    delayMs: Math.max(100, positive("delay-ms", DEFAULT_DELAY_MS)),
    recheck: values.get("recheck") === "true",
  };
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function actorLabel(code: string | null) {
  const normalized = code?.trim() || "";
  if (!normalized) return null;
  if (ACTOR_ALIASES[normalized]) return ACTOR_ALIASES[normalized];
  if (normalized.endsWith("GOV")) {
    const base = normalized.slice(0, -3);
    return `${ACTOR_ALIASES[base] || base} government`;
  }
  if (normalized.endsWith("MIL")) {
    const base = normalized.slice(0, -3);
    return `${ACTOR_ALIASES[base] || base} military`;
  }
  return normalized.length <= 5 ? normalized : null;
}

function buildSearchQuery(episode: EpisodeRow) {
  const actors = [actorLabel(episode.actor1_code), actorLabel(episode.actor2_code)].filter(
    (value): value is string => Boolean(value)
  );
  const family =
    EVENT_FAMILY_ALIASES[episode.event_root_code || ""] ||
    String(episode.archetype_slug || "historical event").replaceAll("-", " ");
  const queryParts = [...new Set([...actors, family, episode.start_date.slice(0, 4)])];
  return queryParts.length >= 2 ? queryParts.join(" ") : `${episode.title} ${family}`;
}

function cleanText(value: string | undefined | null) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(extract: string) {
  return cleanText(extract)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function narrativeFromExtract(extract: string) {
  const sentences = splitSentences(extract);
  return sentences.slice(0, 3).join(" ").slice(0, 1800) || null;
}

function outcomeFromExtract(extract: string) {
  const sentences = splitSentences(extract).filter((sentence) => OUTCOME_PATTERN.test(sentence));
  return sentences.slice(0, 2).join(" ").slice(0, 1200) || null;
}

async function requestJson<T>(url: URL) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": WIKIMEDIA_USER_AGENT,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : 2000 * 2 ** attempt;
      await sleep(Math.min(Math.max(waitMs, 1500), 5000));
      continue;
    }

    throw new Error(`Wikimedia request failed with ${response.status}`);
  }

  throw new Error("Wikimedia request retry budget exhausted");
}

async function searchWikipedia(query: string, limit: number) {
  const url = new URL(WIKIMEDIA_ACTION_URL);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrlimit", String(limit));
  url.searchParams.set("prop", "extracts|info");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exchars", "7000");
  url.searchParams.set("inprop", "url");
  const data = await requestJson<{
    query?: {
      pages?: Array<{
        pageid: number;
        index?: number;
        title: string;
        description?: string;
        extract?: string;
        fullurl?: string;
      }>;
    };
  }>(url);
  return (data.query?.pages || [])
    .sort((left, right) => (left.index || 0) - (right.index || 0))
    .map((page) => ({
      id: page.pageid,
      index: page.index,
      title: page.title,
      description: page.description,
      extract: page.extract,
      fullurl: page.fullurl,
    }));
}

function scoreSource(
  episode: EpisodeRow,
  page: WikiSearchPage,
  searchQuery: string
) {
  const text = `${page.title} ${page.description || ""} ${page.extract || ""}`.toLowerCase();
  const aliases = [actorLabel(episode.actor1_code), actorLabel(episode.actor2_code)].filter(
    (value): value is string => Boolean(value && value.length > 3)
  );
  const actorHits = aliases.filter((alias) => text.includes(alias.toLowerCase())).length;
  const actorScore = aliases.length ? actorHits / aliases.length : 0;
  const outcome = outcomeFromExtract(page.extract || "");
  const narrative = narrativeFromExtract(page.extract || "");
  const narrativeScore = clampUnit((narrative?.length || 0) / 1200);
  const outcomeScore = outcome ? 1 : 0;
  const episodeYear = Number.parseInt(episode.start_date.slice(0, 4), 10);
  const narrativeYears = [...(narrative || "").matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(
    (match) => Number.parseInt(match[1], 10)
  );
  const sourceHeaderYears = [
    ...`${page.title} ${page.description || ""}`.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g),
  ].map((match) => Number.parseInt(match[1], 10));
  const sourceHeaderEraMismatch = sourceHeaderYears.some(
    (year) => Number.isFinite(episodeYear) && Math.abs(year - episodeYear) > 8
  );
  const temporalFitScore = narrativeYears.some(
    (year) => Number.isFinite(episodeYear) && Math.abs(year - episodeYear) <= 8
  )
    ? 1
    : 0;
  const currentYear = new Date().getUTCFullYear();
  const modernMismatch =
    sourceHeaderEraMismatch ||
    (narrativeYears.some((year) => year >= currentYear - 3) && temporalFitScore === 0);
  const titleText = page.title.toLowerCase();
  const genericTitle =
    aliases.some((alias) => titleText === alias.toLowerCase()) ||
    !titleText.includes(" ") ||
    /^list of\b/.test(titleText) ||
    /\bongoing\b/.test(titleText) ||
    /^20\d{2} in\b/.test(titleText) ||
    /^(history|foreign relations|politics|economy|culture) of\b/.test(titleText);
  const titleScore = genericTitle ? 0 : 1;
  const familyTerms =
    EVENT_FAMILY_TERMS[episode.event_root_code || ""] ||
    ["conflict", "crisis", "agreement", "government", "military"];
  const familyScore = familyTerms.some((term) => text.includes(term)) ? 1 : 0;
  const familyHeaderScore = familyTerms.some((term) =>
    `${page.title} ${page.description || ""}`.toLowerCase().includes(term)
  )
    ? 1
    : 0;

  return {
    score: round(
      clampUnit(
          0.25 +
          actorScore * 0.2 +
          temporalFitScore * 0.15 +
          narrativeScore * 0.15 +
          outcomeScore * 0.25 +
          titleScore * 0.05 +
          familyScore * 0.1 -
          (genericTitle ? 0.2 : 0) -
          (modernMismatch ? 0.25 : 0)
      )
    ),
    narrative,
    outcome,
    titleScore,
    familyScore,
    familyHeaderScore,
    temporalFitScore,
    modernMismatch,
  };
}

async function enrichEpisode(
  episode: EpisodeRow,
  options: EnrichmentOptions,
  searchCache: Map<string, WikiSearchPage[]>
): Promise<EnrichedEpisode> {
  const searchQuery = buildSearchQuery(episode);
  let pages = searchCache.get(searchQuery);
  if (!pages) {
    pages = await searchWikipedia(searchQuery, options.searchResults);
    searchCache.set(searchQuery, pages);
    await sleep(options.delayMs);
  }

  const candidates: Array<{
    page: WikiSearchPage;
    sourceRank: number;
    score: ReturnType<typeof scoreSource>;
  }> = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (!page.extract) continue;
    candidates.push({
      page,
      sourceRank: index + 1,
      score: scoreSource(episode, page, searchQuery),
    });
  }

  candidates.sort((left, right) => right.score.score - left.score.score);
  const best =
    candidates.find(
      (candidate) =>
        !candidate.score.modernMismatch &&
        candidate.score.familyHeaderScore === 1 &&
        candidate.score.titleScore === 1
    ) || null;
  const source = best?.page || null;
  const narrativeSummary = best?.score.narrative || null;
  const outcomeSummary = best?.score.outcome || null;
  const enrichmentScore = best?.score.score || 0;
  const promotionEligible = Boolean(
      source &&
      outcomeSummary &&
      episode.member_count >= 2 &&
      enrichmentScore >= 0.78 &&
      best?.score.familyHeaderScore === 1 &&
      best?.score.temporalFitScore === 1 &&
      best?.score.modernMismatch === false
  );

  return {
    episode,
    searchQuery,
    source,
    sourceRank: best?.sourceRank || null,
    narrativeSummary,
    outcomeSummary,
    enrichmentScore,
    promotionEligible,
    metadata: {
      enrichment_provider: "wikimedia-wikipedia",
      enrichment_method: "search-then-extract",
      search_query: searchQuery,
      candidate_titles: pages.map((page) => page.title),
      selected_source_title: best?.page.title || null,
      selected_source_family_match: best?.score.familyHeaderScore === 1,
      outcome_evidence_found: Boolean(outcomeSummary),
      promotion_reason: promotionEligible
        ? "Repeated GDELT signal plus narrative source and explicit outcome language."
        : "Needs stronger source or explicit outcome evidence before promotion.",
    },
  };
}

async function loadEpisodes(db: any, options: EnrichmentOptions) {
  let query = db
    .from("gdelt_historical_episodes")
    .select(
      "id,dataset,title,summary,structural_pattern,archetype_slug,actor1_code,actor2_code,event_root_code,start_date,end_date,member_count,total_articles,evidence_score,status,metadata"
    )
    .eq("dataset", options.dataset)
    .in("status", ["candidate", "enriched"]);
  if (!options.recheck) {
    query = query.eq("enrichment_attempted", false);
  }
  const { data, error } = await query
    .order("evidence_score", { ascending: false })
    .limit(options.maxEpisodes);
  if (error) throw error;
  return (data || []) as EpisodeRow[];
}

async function persistEnrichment(db: any, enrichment: EnrichedEpisode) {
  const episode = enrichment.episode;
  const metadata = {
    ...(episode.metadata || {}),
    ...enrichment.metadata,
  };
  const { error: updateError } = await db
    .from("gdelt_historical_episodes")
    .update({
      narrative_summary: enrichment.narrativeSummary,
      outcome_summary: enrichment.outcomeSummary,
      source_count: enrichment.source ? 1 : 0,
      enrichment_score: enrichment.enrichmentScore,
      promotion_eligible: enrichment.promotionEligible,
      enrichment_attempted: true,
      enrichment_last_error: null,
      enriched_at: new Date().toISOString(),
      status: enrichment.source && enrichment.enrichmentScore >= 0.65 ? "enriched" : "candidate",
      metadata,
    })
    .eq("id", episode.id);
  if (updateError) throw updateError;

  const { error: deleteSourceError } = await db
    .from("gdelt_historical_episode_sources")
    .delete()
    .eq("episode_id", episode.id);
  if (deleteSourceError) throw deleteSourceError;

  if (!enrichment.source) return;

  const sourceUrl =
    enrichment.source.fullurl ||
    `https://en.wikipedia.org/wiki/${encodeURIComponent(enrichment.source.title.replaceAll(" ", "_"))}`;
  const { error: sourceError } = await db
    .from("gdelt_historical_episode_sources")
    .upsert(
      {
        episode_id: episode.id,
        source_type: "wikipedia",
        source_title: enrichment.source.title,
        source_url: sourceUrl,
        source_excerpt: enrichment.narrativeSummary,
        source_rank: enrichment.sourceRank || 1,
        metadata: {
          search_query: enrichment.searchQuery,
          retrieved_via: "MediaWiki REST search + Action API extract",
          outcome_summary: enrichment.outcomeSummary,
        },
      },
      { onConflict: "episode_id,source_url" }
    );
  if (sourceError) throw sourceError;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

  const db = createClient(url, key);
  const episodes = await loadEpisodes(db, options);
  const searchCache = new Map<string, WikiSearchPage[]>();
  const enriched: EnrichedEpisode[] = [];
  const failures: Array<{ episode: string; error: string }> = [];

  for (const episode of episodes) {
    try {
      const result = await enrichEpisode(episode, options, searchCache);
      enriched.push(result);
      if (options.mode === "import") await persistEnrichment(db, result);
    } catch (error: any) {
      const message = error.message || "Unknown enrichment error";
      failures.push({ episode: episode.title, error: message });
      if (options.mode === "import") {
        const { error: retryStateError } = await db
          .from("gdelt_historical_episodes")
          .update({
            enrichment_attempted: false,
            enrichment_last_error: message,
          })
          .eq("id", episode.id);
        if (retryStateError) {
          failures.push({ episode: episode.title, error: retryStateError.message });
        }
      }
    }
  }

  const promotionEligible = enriched.filter((item) => item.promotionEligible).length;
  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        dataset: options.dataset,
        episodesConsidered: episodes.length,
        enrichedEpisodes: enriched.filter((item) => Boolean(item.source)).length,
        promotionEligible,
        noNarrativeMatch: enriched.filter((item) => !item.source).length,
        failures,
        results: enriched.slice(0, 12).map((item) => ({
          episode: item.episode.title,
          searchQuery: item.searchQuery,
          source: item.source?.title || null,
          sourceUrl: item.source?.fullurl || null,
          enrichmentScore: item.enrichmentScore,
          promotionEligible: item.promotionEligible,
          narrativeSummary: item.narrativeSummary,
          outcomeSummary: item.outcomeSummary,
        })),
      },
      null,
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
