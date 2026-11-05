import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", override: true });
dotenv.config();

const DEFAULT_DATASET = "gdelt-1.0-reduced-sample-1000";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_MIN_MEMBERS = 2;
const DEFAULT_MIN_ARTICLES = 0;
const DEFAULT_MAX_EPISODES = 2500;

type ClusterOptions = {
  mode: "dry-run" | "import";
  dataset: string;
  pageSize: number;
  windowDays: number;
  minMembers: number;
  minArticles: number;
  maxEpisodes: number;
};

type GdeltRow = {
  dataset: string;
  global_event_id: number;
  event_date: string | null;
  actor1_code: string | null;
  actor2_code: string | null;
  event_code: string | null;
  event_base_code: string | null;
  event_root_code: string | null;
  quad_class: number | null;
  goldstein_scale: number | null;
  num_events: number | null;
  num_articles: number | null;
  action_geo_country_code: string | null;
  action_geo_lat: number | null;
  action_geo_long: number | null;
};

type MutableEpisode = {
  key: string;
  rows: GdeltRow[];
  startDate: string;
  endDate: string;
  actor1Code: string;
  actor2Code: string;
  eventRootCode: string;
  geoKey: string;
};

type Episode = {
  episodeKey: string;
  title: string;
  summary: string;
  structuralPattern: string;
  archetypeSlug: string;
  eventRootCode: string;
  eventBaseCode: string | null;
  actor1Code: string;
  actor2Code: string;
  actionGeoCountryCode: string | null;
  startDate: string;
  endDate: string;
  memberCount: number;
  totalEvents: number;
  totalArticles: number;
  peakArticles: number;
  averageGoldstein: number | null;
  minimumGoldstein: number | null;
  maximumGoldstein: number | null;
  dominantQuadClass: number | null;
  evidenceScore: number;
  sourceCompleteness: "sampled" | "complete" | "unknown";
  metadata: Record<string, unknown>;
  rows: GdeltRow[];
};

const EVENT_FAMILIES: Record<
  string,
  { label: string; archetype: string; pattern: string }
> = {
  "01": {
    label: "Public declaration",
    archetype: "the-declarer",
    pattern: "An actor uses public communication to establish a position and shape the field before committing resources.",
  },
  "02": {
    label: "Appeal",
    archetype: "the-petitioner",
    pattern: "A dependent or challenger appeals to another actor for recognition, support, or a change in behavior.",
  },
  "03": {
    label: "Intent to cooperate",
    archetype: "the-negotiator",
    pattern: "Actors signal that coordination is possible while preserving room to bargain over terms.",
  },
  "04": {
    label: "Consultation",
    archetype: "the-council",
    pattern: "Actors exchange information or seek alignment before a consequential decision.",
  },
  "05": {
    label: "Diplomatic cooperation",
    archetype: "the-broker",
    pattern: "Actors use formal cooperation to stabilize a relationship or preserve a shared order.",
  },
  "06": {
    label: "Material cooperation",
    archetype: "the-patron",
    pattern: "An actor converts alignment into practical support, resources, or coordinated action.",
  },
  "07": {
    label: "Aid and protection",
    archetype: "the-patron-and-dependent",
    pattern: "A patron supplies relief or protection while the recipient becomes tied to the patron's capacity and conditions.",
  },
  "08": {
    label: "Yielding",
    archetype: "the-concession-maker",
    pattern: "One side yields, accepts terms, or reduces resistance in response to pressure or changing incentives.",
  },
  "09": {
    label: "Investigation",
    archetype: "the-watcher-and-suspect",
    pattern: "An actor increases scrutiny of another, turning uncertainty into surveillance, accusation, or a search for leverage.",
  },
  "10": {
    label: "Demand",
    archetype: "the-claimant-and-gatekeeper",
    pattern: "A claimant presses for a change while a gatekeeper decides whether the demand becomes policy.",
  },
  "11": {
    label: "Disapproval",
    archetype: "the-judge-and-transgressor",
    pattern: "An actor marks another as outside acceptable behavior, raising the social or diplomatic cost of noncompliance.",
  },
  "12": {
    label: "Rejection",
    archetype: "the-refuser",
    pattern: "A proposal, relationship, or settlement is refused, narrowing the path to compromise.",
  },
  "13": {
    label: "Threat",
    archetype: "the-coercer-and-defier",
    pattern: "An actor signals that the cost of resistance will rise, inviting either concession or escalation.",
  },
  "14": {
    label: "Protest",
    archetype: "the-public-challenger",
    pattern: "A public or excluded actor contests an established order, testing whether authority can absorb dissent.",
  },
  "15": {
    label: "Force posture",
    archetype: "the-spectacle-of-power",
    pattern: "An actor displays capability to alter the perceived balance without yet crossing into direct violence.",
  },
  "16": {
    label: "Reduced relations",
    archetype: "the-fracturing-alliance",
    pattern: "A relationship loses trust or institutional depth, making future cooperation more conditional and brittle.",
  },
  "17": {
    label: "Coercion",
    archetype: "the-coercer-and-resister",
    pattern: "An actor attempts to change another's behavior through pressure, creating a contest between compliance and resistance.",
  },
  "18": {
    label: "Assault",
    archetype: "the-escalation-spiral",
    pattern: "Pressure becomes physical action, increasing the chance that retaliation and commitment will outrun negotiation.",
  },
  "19": {
    label: "Fight",
    archetype: "the-rivalry-in-motion",
    pattern: "Rival actors enter an active contest in which each move changes the other's available options.",
  },
  "20": {
    label: "Mass violence",
    archetype: "the-breakdown-of-restraint",
    pattern: "The conflict crosses a threshold where ordinary restraints fail and the cost of containment rises sharply.",
  },
};

function parseArgs(argv: string[]): ClusterOptions {
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
  const nonNegative = (key: string, fallback: number) => {
    const value = Number.parseInt(values.get(key) || "", 10);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  return {
    mode: values.get("mode") === "import" ? "import" : "dry-run",
    dataset: values.get("dataset") || DEFAULT_DATASET,
    pageSize: Math.min(1000, positive("page-size", DEFAULT_PAGE_SIZE)),
    windowDays: positive("window-days", DEFAULT_WINDOW_DAYS),
    minMembers: positive("min-members", DEFAULT_MIN_MEMBERS),
    minArticles: nonNegative("min-articles", DEFAULT_MIN_ARTICLES),
    maxEpisodes: positive("max-episodes", DEFAULT_MAX_EPISODES),
  };
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function dateDistanceInDays(left: string, right: string) {
  const leftTime = Date.parse(`${left}T00:00:00Z`);
  const rightTime = Date.parse(`${right}T00:00:00Z`);
  return Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000);
}

function normalizeActor(value: string | null) {
  return value?.trim() || "UNKNOWN";
}

function geoBucket(row: GdeltRow) {
  if (row.action_geo_country_code) return row.action_geo_country_code;
  if (row.action_geo_lat == null || row.action_geo_long == null) return "GLOBAL";
  const latitude = Math.round(Number(row.action_geo_lat) / 5) * 5;
  const longitude = Math.round(Number(row.action_geo_long) / 5) * 5;
  return `${latitude.toFixed(0)},${longitude.toFixed(0)}`;
}

function featureKey(row: GdeltRow) {
  return [
    normalizeActor(row.actor1_code),
    normalizeActor(row.actor2_code),
    row.event_root_code || "UNKNOWN",
    geoBucket(row),
  ].join("|");
}

function safeCount(value: number | null, fallback: number) {
  return Number.isFinite(value) && value !== null && value >= 0 ? value : fallback;
}

function familyFor(rootCode: string) {
  return EVENT_FAMILIES[rootCode] || {
    label: "Unclassified event",
    archetype: "the-unknown-pressure",
    pattern: "Actors and institutions are producing a repeated signal that has not yet been given a stable narrative label.",
  };
}

function resolveSourceCompleteness(
  dataset: string,
  metadata: Record<string, unknown> | null | undefined
): Episode["sourceCompleteness"] {
  const sampleEvery = metadata?.sample_every ?? metadata?.sampleEvery;
  return sampleEvery || /sample/i.test(dataset) ? "sampled" : "complete";
}

function dominantValue(values: Array<string | number | null>) {
  const counts = new Map<string, { value: string | number; count: number }>();
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const key = String(value);
    const existing = counts.get(key);
    counts.set(key, existing ? { value: existing.value, count: existing.count + 1 } : { value, count: 1 });
  }
  return [...counts.values()].sort((left, right) => right.count - left.count)[0]?.value ?? null;
}

function buildEpisode(cluster: MutableEpisode, options: ClusterOptions, sourceCompleteness: Episode["sourceCompleteness"]): Episode {
  const family = familyFor(cluster.eventRootCode);
  const memberCount = cluster.rows.length;
  const totalEvents = cluster.rows.reduce(
    (total, row) => total + safeCount(row.num_events, 1),
    0
  );
  const articleCounts = cluster.rows.map((row) => safeCount(row.num_articles, 0));
  const totalArticles = articleCounts.reduce((total, count) => total + count, 0);
  const peakArticles = Math.max(0, ...articleCounts);
  const goldsteinValues = cluster.rows
    .map((row) => row.goldstein_scale)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const actorSpecificity =
    (cluster.actor1Code !== "UNKNOWN" ? 0.5 : 0) +
    (cluster.actor2Code !== "UNKNOWN" ? 0.5 : 0);
  const durationDays = dateDistanceInDays(cluster.startDate, cluster.endDate);
  const recurrenceScore = clampUnit(memberCount / 6);
  const articleScore = clampUnit(Math.log1p(totalArticles) / Math.log1p(5000));
  const durationScore = clampUnit(durationDays / 60);
  const evidenceScore = round(
    recurrenceScore * 0.4 + articleScore * 0.35 + durationScore * 0.15 + actorSpecificity * 0.1
  );
  const actorPair = `${cluster.actor1Code} / ${cluster.actor2Code}`;
  const yearLabel = cluster.startDate.slice(0, 4);
  const title = `${family.label}: ${actorPair} (${yearLabel})`;
  const geoLabel = cluster.geoKey === "GLOBAL" ? "across the indexed record" : `near ${cluster.geoKey}`;
  const summary = `${family.pattern} The indexed signal involves ${actorPair} ${geoLabel}, with ${memberCount} sampled event rows and ${totalArticles.toLocaleString()} referenced articles between ${cluster.startDate} and ${cluster.endDate}.`;
  const structuralPattern = `${family.pattern} The recurring pressure is ${family.label.toLowerCase()} rather than a single isolated event.`;
  const episodeKey = createHash("sha1")
    .update(`${cluster.key}|${cluster.startDate}|${cluster.endDate}`)
    .digest("hex");

  return {
    episodeKey,
    title,
    summary,
    structuralPattern,
    archetypeSlug: family.archetype,
    eventRootCode: cluster.eventRootCode,
    eventBaseCode: dominantValue(cluster.rows.map((row) => row.event_base_code)) as string | null,
    actor1Code: cluster.actor1Code,
    actor2Code: cluster.actor2Code,
    actionGeoCountryCode:
      cluster.rows.find((row) => row.action_geo_country_code)?.action_geo_country_code || null,
    startDate: cluster.startDate,
    endDate: cluster.endDate,
    memberCount,
    totalEvents,
    totalArticles,
    peakArticles,
    averageGoldstein: goldsteinValues.length
      ? round(goldsteinValues.reduce((total, value) => total + value, 0) / goldsteinValues.length, 3)
      : null,
    minimumGoldstein: goldsteinValues.length ? Math.min(...goldsteinValues) : null,
    maximumGoldstein: goldsteinValues.length ? Math.max(...goldsteinValues) : null,
    dominantQuadClass: dominantValue(cluster.rows.map((row) => row.quad_class)) as number | null,
    evidenceScore,
    sourceCompleteness,
    metadata: {
      clustering_method: "actor-pair-event-root-geo-window",
      clustering_window_days: options.windowDays,
      source_sample_note:
        sourceCompleteness === "sampled"
          ? "Built from a representative GDELT sample; counts describe indexed evidence, not the full source archive."
          : "Built from the imported GDELT source rows.",
      geo_bucket: cluster.geoKey,
      event_family_label: family.label,
    },
    rows: cluster.rows,
  };
}

async function loadSnapshot(db: any, dataset: string) {
  const { data, error } = await db
    .from("gdelt_snapshots")
    .select("id,dataset,status,metadata")
    .eq("dataset", dataset)
    .eq("status", "loaded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No loaded GDELT snapshot found for dataset ${dataset}.`);
  return data as { id: string; dataset: string; status: string; metadata: Record<string, unknown> | null };
}

async function loadRows(db: any, dataset: string, pageSize: number) {
  const rows: GdeltRow[] = [];
  let cursor = 0;
  while (true) {
    const { data, error } = await db
      .from("gdelt_event_index")
      .select(
        "dataset,global_event_id,event_date,actor1_code,actor2_code,event_code,event_base_code,event_root_code,quad_class,goldstein_scale,num_events,num_articles,action_geo_country_code,action_geo_lat,action_geo_long"
      )
      .eq("dataset", dataset)
      .gt("global_event_id", cursor)
      .order("global_event_id", { ascending: true })
      .limit(pageSize);
    if (error) throw error;
    const page = (data || []) as GdeltRow[];
    rows.push(...page.filter((row) => row.event_date && row.event_root_code));
    if (page.length < pageSize) break;
    cursor = page[page.length - 1].global_event_id;
  }
  return rows.sort((left, right) => {
    const dateOrder = String(left.event_date).localeCompare(String(right.event_date));
    return dateOrder || left.global_event_id - right.global_event_id;
  });
}

function clusterRows(rows: GdeltRow[], options: ClusterOptions, sourceCompleteness: Episode["sourceCompleteness"]) {
  const active = new Map<string, MutableEpisode>();
  const finished: Episode[] = [];

  for (const row of rows) {
    if (!row.event_date || !row.event_root_code) continue;
    const key = featureKey(row);
    const existing = active.get(key);
    if (!existing || dateDistanceInDays(existing.endDate, row.event_date) > options.windowDays) {
      if (existing) finished.push(buildEpisode(existing, options, sourceCompleteness));
      active.set(key, {
        key,
        rows: [row],
        startDate: row.event_date,
        endDate: row.event_date,
        actor1Code: normalizeActor(row.actor1_code),
        actor2Code: normalizeActor(row.actor2_code),
        eventRootCode: row.event_root_code,
        geoKey: geoBucket(row),
      });
      continue;
    }

    existing.rows.push(row);
    existing.endDate = row.event_date;
  }

  for (const episode of active.values()) {
    finished.push(buildEpisode(episode, options, sourceCompleteness));
  }

  return finished
    .filter(
      (episode) =>
        episode.memberCount >= options.minMembers && episode.totalArticles >= options.minArticles
    )
    .sort((left, right) => {
      if (right.evidenceScore !== left.evidenceScore) return right.evidenceScore - left.evidenceScore;
      if (right.totalArticles !== left.totalArticles) return right.totalArticles - left.totalArticles;
      return right.startDate.localeCompare(left.startDate);
    })
    .slice(0, options.maxEpisodes);
}

async function importEpisodes(
  db: any,
  snapshot: { id: string; metadata: Record<string, unknown> | null },
  dataset: string,
  episodes: Episode[]
) {
  const { error: deleteMembershipsError } = await db
    .from("gdelt_historical_episode_memberships")
    .delete()
    .eq("dataset", dataset);
  if (deleteMembershipsError) throw deleteMembershipsError;

  const { error: deleteEpisodesError } = await db
    .from("gdelt_historical_episodes")
    .delete()
    .eq("dataset", dataset);
  if (deleteEpisodesError) throw deleteEpisodesError;

  const sourceCompleteness = resolveSourceCompleteness(dataset, snapshot.metadata);
  const episodeIdByKey = new Map<string, string>();
  const episodePayload = episodes.map((episode) => ({
    dataset,
    snapshot_id: snapshot.id,
    episode_key: episode.episodeKey,
    title: episode.title,
    summary: episode.summary,
    structural_pattern: episode.structuralPattern,
    archetype_slug: episode.archetypeSlug,
    event_root_code: episode.eventRootCode,
    event_base_code: episode.eventBaseCode,
    actor1_code: episode.actor1Code,
    actor2_code: episode.actor2Code,
    action_geo_country_code: episode.actionGeoCountryCode,
    start_date: episode.startDate,
    end_date: episode.endDate,
    member_count: episode.memberCount,
    total_events: episode.totalEvents,
    total_articles: episode.totalArticles,
    peak_articles: episode.peakArticles,
    average_goldstein: episode.averageGoldstein,
    minimum_goldstein: episode.minimumGoldstein,
    maximum_goldstein: episode.maximumGoldstein,
    dominant_quad_class: episode.dominantQuadClass,
    evidence_score: episode.evidenceScore,
    source_completeness: sourceCompleteness,
    status: "candidate",
    metadata: episode.metadata,
  }));

  for (let index = 0; index < episodePayload.length; index += 500) {
    const batch = episodePayload.slice(index, index + 500);
    const { data, error } = await db
      .from("gdelt_historical_episodes")
      .insert(batch)
      .select("id,episode_key");
    if (error) throw error;
    for (const row of data || []) {
      episodeIdByKey.set(row.episode_key, row.id);
    }
  }

  const membershipPayload = episodes.flatMap((episode) => {
    const episodeId = episodeIdByKey.get(episode.episodeKey);
    if (!episodeId) return [];
    return episode.rows.map((row) => ({
      episode_id: episodeId,
      dataset,
      global_event_id: row.global_event_id,
      event_date: row.event_date,
      membership_score: round(
        0.4 + 0.6 * clampUnit(safeCount(row.num_articles, 0) / Math.max(episode.peakArticles, 1))
      ),
    }));
  });

  for (let index = 0; index < membershipPayload.length; index += 1000) {
    const batch = membershipPayload.slice(index, index + 1000);
    const { error } = await db.from("gdelt_historical_episode_memberships").insert(batch);
    if (error) throw error;
  }

  return {
    importedEpisodes: episodeIdByKey.size,
    importedMemberships: membershipPayload.length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

  const db = createClient(url, key);
  const snapshot = await loadSnapshot(db, options.dataset);
  const rows = await loadRows(db, options.dataset, options.pageSize);
  const sourceCompleteness = resolveSourceCompleteness(options.dataset, snapshot.metadata);
  const episodes = clusterRows(rows, options, sourceCompleteness);
  const familyCounts = new Map<string, number>();
  for (const episode of episodes) {
    familyCounts.set(episode.archetypeSlug, (familyCounts.get(episode.archetypeSlug) || 0) + 1);
  }

  const result: Record<string, unknown> = {
    mode: options.mode,
    dataset: options.dataset,
    sourceCompleteness,
    inputRows: rows.length,
    episodesFound: episodes.length,
    membershipRows: episodes.reduce((total, episode) => total + episode.rows.length, 0),
    clustering: {
      windowDays: options.windowDays,
      minMembers: options.minMembers,
      minArticles: options.minArticles,
      maxEpisodes: options.maxEpisodes,
    },
    archetypeCounts: Object.fromEntries(familyCounts),
    topEpisodes: episodes.slice(0, 8).map(({ rows: _rows, ...episode }) => episode),
  };

  if (options.mode === "import") {
    result.import = await importEpisodes(db, snapshot, options.dataset, episodes);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
