import { normaliseEvidencePassage, normaliseEvidenceText } from "../../src/lib/evidence-text";
import type { EpisodeSource, NarrativeEpisode } from "../../src/lib/episodes";

/** Restore omitted double quotation marks by copying an unambiguous SOURCE substring.
 * This never authorises paraphrases, missing words, reordered words or other punctuation changes.
 * The ordinary exact-passage validator still runs afterward, and the reviewer sees the restored source text.
 */
export function restoreSourceQuotationMarks(episode: NarrativeEpisode, sources: EpisodeSource[]) {
  const restored: string[] = [];
  const anchors = episode.anchors.map(anchor => {
    const source = sources.find(s => s.id === anchor.sourceId && s.kind !== "illustration");
    if (!source) return anchor;
    const text = `${source.title}. ${source.summary}`.replace(/[\u00ad\u200b\u2060\ufeff]/g, "").replace(/\s+/g, " ").trim();
    if (normaliseEvidenceText(text).includes(normaliseEvidencePassage(anchor.passage))) return anchor;
    const map: number[] = []; let projected = "";
    for (let i = 0; i < text.length; i++) if (!/["“”«»]/.test(text[i])) { projected += text[i]; map.push(i); }
    if (projected.toLowerCase().length !== projected.length) return anchor;
    const needle = normaliseEvidencePassage(anchor.passage).replace(/["“”«»]/g, "");
    const index = projected.toLowerCase().indexOf(needle);
    if (index < 0 || projected.toLowerCase().indexOf(needle, index + 1) >= 0) return anchor;
    let start = map[index], end = map[index + needle.length - 1] + 1;
    while (start > 0 && /["“«]/.test(text[start - 1])) start--;
    while (end < text.length && /["”»]/.test(text[end])) end++;
    const passage = text.slice(start, end);
    if (passage.length > 320) return anchor;
    restored.push(anchor.id);
    return { ...anchor, passage };
  });
  return { episode: { ...episode, anchors }, restored };
}
