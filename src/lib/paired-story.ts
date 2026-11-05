import { z } from "zod";
import { anchoredTextSchema, editorialProblems, episodeSchema, validateEpisode, type EpisodeSource } from "./episodes";
import { alignmentSchema, validateAlignment } from "./structural-alignment";

export const pairReadingSchema = z.object({
  shared: z.object({ text: z.string().trim().min(25).max(350), currentBeatIds: z.array(z.string()).min(2), historicalBeatIds: z.array(z.string()).min(2) }),
  differences: z.array(z.object({ now: anchoredTextSchema, then: anchoredTextSchema, implication: z.string().trim().min(25).max(350) })).min(1).max(2),
  alternative: z.object({ text: z.string().trim().min(25).max(350), currentAnchorIds: z.array(z.string()).min(1), historicalAnchorIds: z.array(z.string()).min(1) }),
  continuation: z.object({ historicalBeatIds: z.array(z.string()).min(1), implication: z.string().trim().min(25).max(350).nullable().default(null) }).nullable(),
});
export const pairedStorySchema = z.object({
  version: z.literal(1),
  current: episodeSchema,
  historical: episodeSchema,
  alignment: alignmentSchema,
  reading: pairReadingSchema,
  selection: z.object({
    editorialStandard: z.enum(["baseline-1", "plain-language-2"]).default("baseline-1"),
    candidatesEncoded: z.number().int().min(1),
    candidatesMatched: z.number().int().min(1),
    method: z.literal("ordered-relations-2"),
    review: z.enum(["automated-source-and-claim-check", "agent-source-and-structure-check"]),
    note: z.string().min(30).max(800),
  }),
});
export type PairedStory = z.infer<typeof pairedStorySchema>;

/** Exact references and structural consistency are necessary, not proof of an interpretation. */
export function validatePairedStory(value: unknown, currentSources: EpisodeSource[], historicalSources: EpisodeSource[]): PairedStory {
  const pair = pairedStorySchema.parse(value);
  validateEpisode(pair.current, currentSources);
  validateEpisode(pair.historical, historicalSources);
  if (new Set(pair.historical.anchors.map(a => a.sourceId)).size < 2) throw new Error("Historical evidence must be anchored in at least two sources.");
  validateAlignment(pair.alignment, pair.current, pair.historical);
  const check = (ids: string[], allowed: string[], kind: string) => {
    if (new Set(ids).size !== ids.length || ids.some(id => !allowed.includes(id))) throw new Error(`The reading has an invalid ${kind} reference.`);
  };
  check(pair.reading.shared.currentBeatIds, pair.alignment.beats.flatMap(b => b.currentBeatIds), "current matched beat");
  check(pair.reading.shared.historicalBeatIds, pair.alignment.beats.flatMap(b => b.historicalBeatIds), "historical matched beat");
  for (const difference of pair.reading.differences) {
    check(difference.now.anchorIds, pair.current.anchors.map(a => a.id), "current difference");
    check(difference.then.anchorIds, pair.historical.anchors.map(a => a.id), "historical difference");
  }
  check(pair.reading.alternative.currentAnchorIds, pair.current.anchors.map(a => a.id), "current alternative");
  check(pair.reading.alternative.historicalAnchorIds, pair.historical.anchors.map(a => a.id), "historical alternative");
  if (pair.reading.continuation) {
    const last = pair.historical.beats.findIndex(b => b.id === pair.alignment.beats.at(-1)!.historicalBeatIds.at(-1));
    check(pair.reading.continuation.historicalBeatIds, pair.historical.beats.slice(last + 1).map(b => b.id), "later historical beat");
  }
  const prose = [pair.reading.shared.text, pair.reading.alternative.text,
    ...pair.reading.differences.flatMap(d => [d.now.text, d.then.text, d.implication]),
    ...(pair.reading.continuation?.implication ? [pair.reading.continuation.implication] : [])];
  for (const text of prose) {
    const problems = editorialProblems(text, false, pair.selection.editorialStandard);
    if (problems.length) throw new Error(problems.join(" "));
    if (/\b(?:unconscious|disowned|repressed|shadow projection|human psyche|grandiosity indicator)\b/i.test(text)) throw new Error("A comparison cannot establish hidden mental states or diagnose a collective.");
  }
  return pair;
}

export const illuminationSchema = z.object({
  verdict: z.enum(["helpful", "unhelpful", "unsure"]),
  reason: z.enum(["structure", "difference", "too-loose", "unclear", "source-issue"]).nullable().default(null),
  pattern: z.string().trim().max(500).default(""),
  explanationSeen: z.boolean(),
}).strict();
export type IlluminationInput = z.infer<typeof illuminationSchema>;
