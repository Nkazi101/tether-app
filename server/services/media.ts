import { XMLParser } from "fast-xml-parser";
import type { EvidenceSource } from "../../src/lib/comparison";
import { imageFromFeed, type StoryImage } from "../../src/lib/story-media";
import { canonicalReportingUrl, cleanFeedText, newsFeeds } from "./ingestion";
import { fetchArticle } from "./article";

// This cache is cosmetic and reconstructible. It never owns evidence, jobs,
// permissions, or the immutable comparison record.
let feedCache: { expires: number; images: Record<string, StoryImage> } = {
  expires: 0,
  images: {},
};
let refreshing: Promise<Record<string, StoryImage>> | undefined;
export async function feedImages(): Promise<Record<string, StoryImage>> {
  if (feedCache.expires > Date.now()) return feedCache.images;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const results = await Promise.allSettled(
      newsFeeds.map(async (feed) => {
        const response = await fetch(feed.url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "Tether/1.0 (publisher imagery)" },
        });
        if (!response.ok) throw new Error("Feed unavailable");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No feed body");
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            length += part.value.length;
            if (length > 1_500_000) throw new Error("Feed too large");
            chunks.push(part.value);
          }
        } finally {
          await reader.cancel();
        }
        const xml = Buffer.concat(chunks).toString("utf8");
        if (/<!DOCTYPE/i.test(xml)) throw new Error("Unsupported feed");
        const parsed = new XMLParser({
          ignoreAttributes: false,
          processEntities: false,
        }).parse(xml);
        const raw = parsed.rss?.channel?.item || [];
        const images: Record<string, StoryImage> = {};
        for (const item of (Array.isArray(raw) ? raw : [raw]).slice(0, 100)) {
          if (typeof item.link !== "string" || typeof item.title !== "string")
            continue;
          try {
            const url = canonicalReportingUrl(item.link);
            const image = imageFromFeed(
              item,
              cleanFeedText(item.title),
              feed.name,
              url,
            );
            if (image) images[url] = image;
          } catch {
            /* A malformed publisher item must not break the feed. */
          }
        }
        return images;
      }),
    );
    const successful = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    // Keep the last successful snapshot if a publisher is briefly unavailable.
    const images: Record<string, StoryImage> = { ...feedCache.images };
    for (const snapshot of successful) Object.assign(images, snapshot);
    feedCache = {
      expires: Date.now() + (successful.length ? 15 * 60000 : 60000),
      images: Object.fromEntries(Object.entries(images).slice(-1500)),
    };
    return feedCache.images;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = undefined;
  }
}
const articleCache = new Map<
  string,
  { expires: number; image: StoryImage | null }
>();
const pending = new Map<string, Promise<StoryImage | null>>();
export async function sourceImage(
  source: EvidenceSource | undefined,
): Promise<StoryImage | null> {
  if (!source?.url || source.kind === "user-description") return null;
  if (source.image) return source.image;
  const url = canonicalReportingUrl(source.url);
  const cached = articleCache.get(url);
  if (cached && cached.expires > Date.now()) return cached.image;
  if (pending.has(url)) return pending.get(url)!;
  if (pending.size >= 8) return null;
  // Existing news records predate image metadata. Resolve on a reader's first
  // visit without rewriting those historical evidence snapshots.
  const work = (async () => {
    const feeds = await feedImages();
    let image: StoryImage | null = feeds[url] || null;
    if (!image) {
      try {
        image = (await fetchArticle(url)).image || null;
      } catch {
        /* Use a labelled fallback. */
      }
    }
    articleCache.set(url, {
      expires: Date.now() + (image ? 3600000 : 300000),
      image,
    });
    if (articleCache.size > 300)
      articleCache.delete(articleCache.keys().next().value!);
    return image;
  })();
  pending.set(url, work);
  try {
    return await work;
  } finally {
    pending.delete(url);
  }
}
