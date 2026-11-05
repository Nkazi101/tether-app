import { isHistoricalMirror } from "./source-quality";

/** Prefer two searched pages about the same candidate to a bag of unrelated hits.
 * The generated plan is a lead only: every URL must also exist in the search trace.
 */
export function historicalReadPlan(text: string, tracedUrls: string[], limit = 8): string[] {
  const eligible = [...new Set(tracedUrls)].filter(value => {
    try { return /^https?:$/.test(new URL(value).protocol) && !isHistoricalMirror(value); } catch { return false; }
  }).slice(0, 35);
  const allowed = new Set(eligible), chosen: string[] = [];
  const host = (value: string) => new URL(value).hostname.replace(/^www\./, "");
  let candidates: unknown[] = [];
  try {
    const plan = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, ""));
    if (Array.isArray(plan.candidates)) candidates = plan.candidates.slice(0, Math.min(6,Math.ceil(limit/2)));
  } catch { /* Older search responses remain usable as discovery traces. */ }
  for (const candidate of candidates) {
    const urls = candidate && typeof candidate === "object" && "urls" in candidate ? candidate.urls : null;
    if (!Array.isArray(urls)) continue;
    const distinct = urls.filter((url): url is string => typeof url === "string" && allowed.has(url));
    const pair = distinct.filter((url, i) => distinct.findIndex(other => host(other) === host(url)) === i).slice(0, 2);
    if (pair.length < 2) continue;
    for (const url of pair) if (!chosen.includes(url) && chosen.length < limit) chosen.push(url);
  }
  for (const url of eligible) {
    if (chosen.length >= limit) break;
    if (!chosen.some(other => host(other) === host(url))) chosen.push(url);
  }
  return chosen;
}
