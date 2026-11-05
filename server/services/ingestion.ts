import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import {
  ENGINE_VERSION,
  type EvidenceSource,
  type NewsTopic,
} from "../../src/lib/comparison";
import { Store, hash } from "./store";
import { imageFromFeed } from "../../src/lib/story-media";
import { canonicalReportingUrl } from "../domain/reporting";
import {NARRATIVE_RESEARCH_VERSION} from './narrative-research';
export { canonicalReportingUrl } from "../domain/reporting";

export const newsFeeds: Array<{ url: string; name: string; topic: NewsTopic }> =
  [
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      name: "BBC",
      topic: "world",
    },
    {
      url: "https://www.theguardian.com/world/rss",
      name: "The Guardian",
      topic: "world",
    },
    {
      url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
      name: "BBC",
      topic: "politics",
    },
    {
      url: "https://www.theguardian.com/us-news/us-politics/rss",
      name: "The Guardian",
      topic: "politics",
    },
    {
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      name: "BBC",
      topic: "business",
    },
    {
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      name: "BBC",
      topic: "technology",
    },
    {
      url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      name: "BBC",
      topic: "science",
    },
    {
      url: "https://feeds.bbci.co.uk/news/health/rss.xml",
      name: "BBC",
      topic: "health",
    },
    {
      url: "https://www.theguardian.com/environment/rss",
      name: "The Guardian",
      topic: "environment",
    },
    {
      url: "https://www.theguardian.com/culture/rss",
      name: "The Guardian",
      topic: "culture",
    },
    {
      url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
      name: "BBC",
      topic: "entertainment",
    },
    {
      url: "https://feeds.bbci.co.uk/sport/rss.xml",
      name: "BBC Sport",
      topic: "sports",
    },
    {
      url: "https://www.theguardian.com/lifeandstyle/rss",
      name: "The Guardian",
      topic: "lifestyle",
    },
  ];
export function cleanFeedText(value: string) {
  let text = value;
  for (let pass = 0; pass < 3; pass++) {
    const $ = load(text);
    $("script,style,noscript").remove();
    const next = $.root().text();
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+/g, " ").trim();
}
export async function ingestReporting(
  store: Store,
  options: { queueResearch?: boolean } = {},
) {
  const responses = await Promise.allSettled(
    newsFeeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Tether/1.0 (reporting discovery)" },
      });
      if (!response.ok) throw new Error(`Feed returned ${response.status}`);
      // Feed hosts are fixed. Stream limits still apply to prevent a large feed
      // from exhausting worker memory before parsing.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No feed body");
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          length += next.value.length;
          if (length > 1_500_000) throw new Error("Feed too large");
          chunks.push(next.value);
        }
      } finally {
        await reader.cancel();
      }
      const xml = Buffer.concat(chunks).toString("utf8");
      if (/<!DOCTYPE/i.test(xml))
        throw new Error("Feed document types are not accepted");
      const parsed = new XMLParser({
        ignoreAttributes: false,
        processEntities: false,
      }).parse(xml);
      const raw = parsed.rss?.channel?.item || parsed.feed?.entry || [];
      const items = (Array.isArray(raw) ? raw : [raw]).slice(0, 6);
      return items.flatMap(
        (item: Record<string, unknown>): EvidenceSource[] => {
          const title =
            typeof item.title === "string" ? cleanFeedText(item.title) : "";
          const link = typeof item.link === "string" ? item.link : "";
          const description =
            typeof item.description === "string"
              ? cleanFeedText(item.description)
              : "";
          const date =
            typeof item.pubDate === "string" ? Date.parse(item.pubDate) : NaN;
          if (
            !title ||
            !link ||
            description.length < 50 ||
            /\/live\//.test(link) ||
            !Number.isFinite(date) ||
            date > Date.now() + 3600000 ||
            date < Date.now() - 7 * 86400000
          )
            return [];
          try {
            const url = canonicalReportingUrl(link);
            return [
              {
                id: `reporting:${hash(url + description).slice(0, 24)}`,
                title,
                summary: description.slice(0, 5000),
                url,
                publisher: feed.name,
                publishedAt: new Date(date).toISOString(),
                retrievedAt: new Date().toISOString(),
                kind: "reporting",
                topic: feed.topic,
                retrieval: "feed-excerpt",
                image: imageFromFeed(item, title, feed.name, url),
              },
            ];
          } catch {
            return [];
          }
        },
      );
    }),
  );
  const successes = responses.filter(
    (response): response is PromiseFulfilledResult<EvidenceSource[]> =>
      response.status === "fulfilled",
  );
  if (!successes.length)
    throw new Error(
      "All reporting sources were unavailable. Existing published analyses have been retained.",
    );
  const sources = [
    ...new Map(
      successes
        .flatMap((response) => response.value)
        .map((source) => [source.url, source]),
    ).values(),
  ];
  // Interleave topics so one publisher/category cannot monopolize processing.
  const groups = new Map<NewsTopic, EvidenceSource[]>();
  for (const source of sources) {
    const topic = source.topic || "general";
    groups.set(topic, [...(groups.get(topic) || []), source]);
  }
  for (const items of groups.values())
    items.sort(
      (a, b) =>
        Date.parse(b.publishedAt || b.retrievedAt) -
        Date.parse(a.publishedAt || a.retrievedAt),
    );
  const interleaved: EvidenceSource[] = [];
  while ([...groups.values()].some((items) => items.length)) {
    for (const items of groups.values()) {
      const source = items.shift();
      if (source) interleaved.push(source);
    }
  }
  const researchCounts = new Map<NewsTopic, number>();
  let researchQueued = 0;
  let queued = 0;
  for (const source of interleaved) {
    // URL is a stable identity for an evolving report. Content hashes suppress
    // unchanged reports; distinct articles remain distinct until corroborated.
    const owner = "system:reporting";
    await store.rpc("tether_enqueue", {
      p_kind: "analysis",
      p_key: `report:${ENGINE_VERSION}:${hash(source.title + source.summary)}`,
      p_owner: owner,
      p_user: null,
      p_payload: {
        input: source.title,
        question:
          "What does this reporting establish, and which historical relationships deserve investigation?",
        sources: [source],
      },
      p_ip: "reporting-worker",
      p_user_limit: 1500,
      p_ip_limit: 5000,
      p_global_limit: 5000,
    });
    queued++;
    const topic = source.topic || "general";
    const count = researchCounts.get(topic) || 0;
    if (options.queueResearch !== false && count < 2) {
      await store.rpc("tether_enqueue", {
        p_kind: "research",
        p_key: `research:${NARRATIVE_RESEARCH_VERSION}:${hash(source.title + source.summary)}`,
        p_owner: owner,
        p_user: null,
        p_payload: {
          input: source.title,
          method: NARRATIVE_RESEARCH_VERSION,
          question:
            "Which earlier episodes best explain these relationships, what differs, and what should a reader watch next?",
          sources: [source],
        },
        p_ip: "reporting-worker",
        p_user_limit: 1500,
        p_ip_limit: 5000,
        p_global_limit: 5000,
      });
      researchCounts.set(topic, count + 1);
      researchQueued++;
    }
  }
  console.info(
    JSON.stringify({
      event: "reporting-ingestion",
      feedsSucceeded: successes.length,
      feedsFailed: responses.length - successes.length,
      queued,
      researchQueued,
      topics: [...researchCounts.keys()],
    }),
  );
  return {
    feedsSucceeded: successes.length,
    feedsFailed: responses.length - successes.length,
    queued,
    researchQueued,
    topics: [...researchCounts.keys()],
  };
}
