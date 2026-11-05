import type { NarrativeEpisode } from "../../src/lib/episodes";

/** The discovery call sees roles and relationships, not headline names or topic vocabulary. */
export function historicalSearchView(episode: NarrativeEpisode) {
  const nodes = new Map([
    ...episode.actors.map((a, i) => [a.id, `actor-${i + 1}`] as const),
    ...episode.resources.map((r, i) => [r.id, `resource-${i + 1}`] as const),
  ]);
  return {
    beforeYear: episode.startYear,
    temporalStatus: episode.temporalStatus,
    basis: episode.basis,
    actors: episode.actors.map(a => ({ id: nodes.get(a.id), kind: a.kind })),
    resources: episode.resources.map(r => ({ id: nodes.get(r.id), function: r.kind })),
    moments: episode.beats.map((beat, i) => ({ order: i + 1, relationships: episode.relations.filter(r => r.beatId === beat.id).map(r => ({
      from: nodes.get(r.from), action: r.predicate, to: nodes.get(r.to), layer: r.layer, allegedConduct: r.allegedConduct,
    })) })),
    stage: episode.position?.stage || "unclear",
  };
}


/** Retrieval clues retain material constraints; they never affect structural ranking. */
export function historicalMaterialClues(episode: NarrativeEpisode) {
  const names = episode.actors.flatMap(a => [a.name, ...a.aliases]).sort((a,b) => b.length-a.length);
  const scrub = (text: string) => names.reduce((value,name) => value.split(name).join("[actor]"),text).slice(0,350);
  return { conflict: scrub(episode.conflict.text), resources: episode.resources.map(r => ({kind:r.kind,description:scrub(r.name)})) };
}
