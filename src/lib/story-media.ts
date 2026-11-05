import { z } from "zod";

// Only publisher image CDNs may be embedded. Metadata must never cause a
// reader's browser to request localhost, private hosts, or arbitrary trackers.
const imageHosts = new Set([
  "ichef.bbci.co.uk",
  "images.bbci.co.uk",
  "media.guim.co.uk",
  "i.guim.co.uk",
  "images.unsplash.com",
  "upload.wikimedia.org",
  "static01.nyt.com",
  "media.npr.org",
  "npr.brightspotcdn.com",
  "media.cnn.com",
  "cdn.britannica.com",
  "www.loc.gov",
]);
export function safeImageUrl(value: unknown, base?: string): string | null {
  if (typeof value !== "string" || value.length > 3000) return null;
  try {
    const url = new URL(value.replace(/&amp;/g, "&"), base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !imageHosts.has(url.hostname)
    )
      return null;
    if (/\b(logo|favicon|avatar|placeholder)\b/i.test(url.pathname))
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export const storyImageSchema = z.object({
  url: z.string().refine((value) => Boolean(safeImageUrl(value))),
  alt: z.string().max(600),
  credit: z.string().max(500),
  sourceUrl: z.string().url(),
  kind: z.enum(["article", "archive", "illustration"]),
});
export type StoryImage = z.infer<typeof storyImageSchema>;

export function imageFromFeed(
  item: Record<string, unknown>,
  title: string,
  publisher: string,
  sourceUrl: string,
): StoryImage | undefined {
  const raw = [
    item["media:content"],
    item["media:thumbnail"],
    item.enclosure,
  ].flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
  raw.sort(
    (a, b) =>
      Number((b as Record<string, unknown>)?.["@_width"] || 0) -
      Number((a as Record<string, unknown>)?.["@_width"] || 0),
  );
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const node = entry as Record<string, unknown>;
    let url = safeImageUrl(node["@_url"]);
    if (!url) continue;
    // BBC publishes 240px thumbnails whose same asset is available at 1024px.
    if (new URL(url).hostname === "ichef.bbci.co.uk")
      url = url.replace(/\/standard\/\d+\//, "/standard/1024/");
    const rawCredit = node["media:credit"];
    const photoCredit =
      typeof rawCredit === "string"
        ? rawCredit
        : rawCredit && typeof rawCredit === "object"
          ? (rawCredit as Record<string, unknown>)["#text"]
          : null;
    return {
      url,
      alt: `Image accompanying “${title}”`,
      credit:
        typeof photoCredit === "string"
          ? `${photoCredit.slice(0, 350)} / ${publisher}`
          : publisher,
      sourceUrl,
      kind: typeof photoCredit === "string" && /^Illustration\b/i.test(photoCredit) ? "illustration" : "article",
    };
  }
  return undefined;
}
