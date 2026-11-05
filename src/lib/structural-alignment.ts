import { z } from "zod";
import type { NarrativeEpisode, EpisodeRelation } from "./episodes";

export const alignmentSchema = z.object({
  version: z.literal(2), method: z.literal("ordered-relations-2"),
  nodes: z.array(z.object({ current: z.string(), historical: z.string() })).min(3).max(10),
  beats: z.array(z.object({
    currentBeatIds: z.array(z.string()).min(1).max(2),
    historicalBeatIds: z.array(z.string()).min(1).max(2),
    relations: z.array(z.object({ current: z.string(), historical: z.string() })).min(1).max(18),
  })).min(2).max(6),
  counts: z.object({ relations: z.number().int(), predicates: z.number().int(), beats: z.number().int(), actors: z.number().int(), currentBeats: z.number().int(), historicalBeats: z.number().int() }),
  searchTruncated: z.boolean(),
});
export type StructuralAlignment = z.infer<typeof alignmentSchema>;
export function earlierEpisode(current: NarrativeEpisode, historical: NarrativeEpisode) {
  if (current.startYear === null || historical.endYear === null) return false;
  if (historical.endYear < current.startYear) return true;
  return historical.endYear === current.startYear && Boolean(current.startDate && historical.endDate && historical.endDate < current.startDate);
}
export const sameRelation = (a: EpisodeRelation, b: EpisodeRelation) => a.predicate === b.predicate && a.layer === b.layer && a.allegedConduct === b.allegedConduct;
export function alignmentCounts(current: NarrativeEpisode, alignment: Pick<StructuralAlignment, "nodes" | "beats">) {
  const relations = alignment.beats.flatMap(b => b.relations).map(p => current.relations.find(r => r.id === p.current)!);
  return { relations: relations.length, predicates: new Set(relations.map(r => r.predicate)).size, beats: alignment.beats.length,
    actors: alignment.nodes.filter(n => current.actors.some(a => a.id === n.current)).length,
    currentBeats: new Set(alignment.beats.flatMap(b => b.currentBeatIds)).size,
    historicalBeats: new Set(alignment.beats.flatMap(b => b.historicalBeatIds)).size };
}
export function connectedRelations(relations: EpisodeRelation[]) {
  if (!relations.length) return false;
  const nodes = new Set(relations.flatMap(r => [r.from, r.to])), visited = new Set([relations[0].from]);
  for (let i = 0; i < nodes.size; i++) for (const edge of relations) { if (visited.has(edge.from)) visited.add(edge.to); if (visited.has(edge.to)) visited.add(edge.from); }
  return visited.size === nodes.size;
}
export function chronologyCompatible(pairs: Array<{ current: number; historical: number }>, next: { current: number; historical: number }) {
  return pairs.every(p => (p.current - next.current) * (p.historical - next.historical) >= 0);
}
/** Grouping differences may be unknown; an order known in both accounts may never reverse. */
export function validateAlignment(value: unknown, current: NarrativeEpisode, historical: NarrativeEpisode): StructuralAlignment {
  const alignment = alignmentSchema.parse(value);
  if (current.encoding !== historical.encoding) throw new Error("Episode encoding contracts differ; re-encode before comparing.");
  if (!earlierEpisode(current, historical)) throw new Error("A comparable historical episode must precede the current one.");
  const nodeMap = new Map(alignment.nodes.map(n => [n.current, n.historical]));
  if (nodeMap.size !== alignment.nodes.length || new Set(nodeMap.values()).size !== nodeMap.size) throw new Error("Actor/resource mappings must be one-to-one.");
  const nowActors = new Set(current.actors.map(a => a.id)), thenActors = new Set(historical.actors.map(a => a.id));
  for (const [left, right] of nodeMap) {
    const a = current.resources.find(r => r.id === left), b = historical.resources.find(r => r.id === right);
    if (!(nowActors.has(left) && thenActors.has(right)) && !(a && b && a.kind === b.kind)) throw new Error("Map actors to actors and resources to resources of the same functional kind.");
  }
  const usedNow = new Set<string>(), usedThen = new Set<string>(), endpoints = new Set<string>();
  const matched: EpisodeRelation[] = [], chronology: Array<{ current: number; historical: number }> = [];
  let lastNow = -1, lastThen = -1;
  const indices = (ids: string[], episode: NarrativeEpisode, last: number) => {
    const positions = ids.map(id => episode.beats.findIndex(b => b.id === id));
    if (positions[0] <= last || positions.some((p, i) => p < 0 || (i > 0 && p !== positions[i - 1] + 1))) throw new Error("Alignment windows must be consecutive, disjoint and ordered.");
    return positions;
  };
  for (const row of alignment.beats) {
    const now = indices(row.currentBeatIds, current, lastNow), then = indices(row.historicalBeatIds, historical, lastThen);
    lastNow = now.at(-1)!; lastThen = then.at(-1)!;
    const earnedNow = new Set<string>(), earnedThen = new Set<string>();
    for (const pair of row.relations) {
      const a = current.relations.find(r => r.id === pair.current), b = historical.relations.find(r => r.id === pair.historical);
      if (!a || !b || usedNow.has(a.id) || usedThen.has(b.id) || !row.currentBeatIds.includes(a.beatId) || !row.historicalBeatIds.includes(b.beatId) || !sameRelation(a, b) || nodeMap.get(a.from) !== b.from || nodeMap.get(a.to) !== b.to) throw new Error("A mapping changes a relationship, direction, identity or evidence scope.");
      const currentBasis = current.beats.find(beat => beat.id === a.beatId)?.temporalBasis;
      const historicalBasis = historical.beats.find(beat => beat.id === b.beatId)?.temporalBasis;
      if (currentBasis && historicalBasis && currentBasis !== historicalBasis) throw new Error("An announced or alleged action cannot be mapped as an occurred action.");
      const order = { current: current.beats.findIndex(beat => beat.id === a.beatId), historical: historical.beats.findIndex(beat => beat.id === b.beatId) };
      if (!chronologyCompatible(chronology, order)) throw new Error("A mapping reverses an order known in both episodes.");
      chronology.push(order); usedNow.add(a.id); usedThen.add(b.id); endpoints.add(a.from); endpoints.add(a.to); earnedNow.add(a.beatId); earnedThen.add(b.beatId); matched.push(a);
    }
    if (earnedNow.size !== now.length || earnedThen.size !== then.length) throw new Error("An alignment window contains an unmatched padding beat.");
  }
  const counts = alignmentCounts(current, alignment);
  if (counts.relations < 3 || counts.predicates < 3 || counts.beats < 2 || counts.actors < 2 || !connectedRelations(matched)) throw new Error("A pair needs three distinct connected actions, two ordered windows and two consistently mapped actors.");
  if (endpoints.size !== nodeMap.size || [...nodeMap.keys()].some(id => !endpoints.has(id))) throw new Error("The map contains unearned correspondences.");
  if (JSON.stringify(counts) !== JSON.stringify(alignment.counts)) throw new Error("Structural counts do not match the recorded map.");
  return alignment;
}
