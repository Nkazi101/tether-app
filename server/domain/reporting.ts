import type { Comparison, EvidenceSource } from "../../src/lib/comparison";
import { sourceSchema } from "../../src/lib/comparison";
import { extractContext } from "./context";
export function canonicalReportingUrl(value: string) {
  const url = new URL(value.replace(/&amp;/g, "&"));
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Unsupported source URL");
  for (const key of [...url.searchParams.keys()])
    if (/^(?:amp;)*(utm_|at_|fbclid|gclid)/i.test(key))
      url.searchParams.delete(key);
  url.hash = "";
  return url.href;
}
export const reportingSourceKey = (source: EvidenceSource) =>
  source.url ? canonicalReportingUrl(source.url) : source.id;
export const reportingEvidence = (sources: EvidenceSource[]) =>
  sources.map((input) => {
    const { id: _id, retrievedAt: _time, url, ...source } = sourceSchema.parse(input);
    return { ...source, url: url ? canonicalReportingUrl(url) : null };
  });
const noise = new Set(
  "a an the and of on in for from with after over amid as to by is are was says say said new news latest live update updates prices price rise rises falls soar fears plans year years world business".split(
    " ",
  ),
);
export function reportingTerms(title: string) {
  const normalize: Record<string, string> = {
    european: "europe",
    russian: "russia",
    supplies: "supply",
    cuts: "cut",
    workers: "worker",
    strikes: "strike",
  };
  return new Set(
    (title.toLowerCase().match(/[a-z]{3,}/g) || [])
      .map((word) => normalize[word] || word)
      .filter((word) => !noise.has(word)),
  );
}
export function isSameReportingEpisode(
  incoming: EvidenceSource,
  comparison: Comparison,
) {
  if (comparison.sources.some((source) => source.url === incoming.url))
    return true;
  const sourceDates = comparison.sources.flatMap((source) =>
    source.publishedAt ? [Date.parse(source.publishedAt)] : [],
  );
  if (
    !incoming.publishedAt ||
    !sourceDates.length ||
    Math.abs(Date.parse(incoming.publishedAt) - Math.max(...sourceDates)) >
      3 * 86400000
  )
    return false;
  const context = extractContext([incoming]);
  if (
    context.family === "unknown" ||
    context.family !== comparison.context.family ||
    context.direction !== comparison.context.direction
  )
    return false;
  const left = reportingTerms(incoming.title);
  const right = reportingTerms(comparison.title);
  const shared = [...left].filter((term) => right.has(term)).length;
  return (
    shared >= 3 &&
    shared / Math.max(1, new Set([...left, ...right]).size) >= 0.6
  );
}
