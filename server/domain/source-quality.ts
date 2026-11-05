import type { EvidenceSource } from "../../src/lib/comparison";
import { normaliseEvidenceText, normaliseEvidencePassage } from "../../src/lib/evidence-text";

export function hasHistoricalFoundation(sources: EvidenceSource[]) {
  return sources.some(source => {
    const p = source.historicalProvenance;
    if (!p || ["secondary", "unclear"].includes(p.role)) return false;
    if (p.checkedBy === "agent-source-audit") return true;
    return Boolean(p.basisPassage && normaliseEvidenceText(`${source.title}. ${source.summary}`).includes(normaliseEvidencePassage(p.basisPassage)));
  });
}
const mirrors = new Set([
  "en-academic.com",
  "wikiwand.com",
  "wikimili.com",
  "dbpedia.org",
]);
const within = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);
const mirrorHost = (host: string) =>
  [...mirrors].some((domain) => within(host, domain));
export function historicalSourceOrigin(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  if (
    mirrorHost(host) ||
    host.endsWith(".wikipedia.org") ||
    host === "wikipedia.org"
  )
    return "wikipedia.org";
  if (within(host, "bbc.com") || within(host, "bbc.co.uk")) return "bbc";
  return host;
}
export function isHistoricalMirror(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  return mirrorHost(host);
}
const shingles = (source: EvidenceSource) => {
  const words = source.summary.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return new Set(
    words
      .slice(0, 2500)
      .flatMap((_, i) =>
        i + 5 <= words.length ? [words.slice(i, i + 5).join(" ")] : [],
      ),
  );
};
export function independentHistoricalSources(sources: EvidenceSource[]) {
  const accepted: Array<{ source: EvidenceSource; terms: Set<string> }> = [];
  for (const source of sources) {
    if (!source.url) continue;
    const terms = shingles(source);
    const duplicate = accepted.some((other) => {
      if (
        historicalSourceOrigin(other.source.url!) ===
        historicalSourceOrigin(source.url!)
      )
        return true;
      if (Math.min(terms.size, other.terms.size) < 40) return false;
      const overlap = [...terms].filter((term) => other.terms.has(term)).length;
      return (
        overlap / Math.min(terms.size, other.terms.size) >= 0.85 ||
        overlap / (terms.size + other.terms.size - overlap) >= 0.65
      );
    });
    if (!duplicate) accepted.push({ source, terms });
  }
  return accepted.map((item) => item.source);
}
