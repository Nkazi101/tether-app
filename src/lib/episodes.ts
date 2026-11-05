import { z } from "zod";
import { normaliseEvidencePassage, normaliseEvidenceText } from "./evidence-text";
import { narrativeAnnotationSchema } from "./narrative-model";

export const EPISODE_VERSION = 1 as const;
export const relationPredicates = [
  "controls", "depends", "requests", "withholds", "withdraws", "supports",
  "challenges", "restricts", "warns", "overrides", "discloses", "accuses",
  "denies", "investigates", "deceives", "compromises", "negotiates", "agrees",
  "adopts", "coordinates", "removes", "substitutes", "tests", "restores",
  "enforces", "defies", "excludes", "protects",
] as const;
export const predicateSchema = z.enum(relationPredicates);
const key = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const refs = z.array(key).min(1).max(3);
export const anchoredTextSchema = z.object({
  text: z.string().trim().min(15).max(350),
  anchorIds: refs,
});
export const episodeSchema = z.object({
  version: z.literal(1),
  encoding: z.enum(["episode-1", "typed-relations-2"]).default("episode-1"),
  id: key,
  title: z.string().trim().min(8).max(160),
  period: z.string().trim().min(4).max(100),
  startYear: z.number().int().min(-10000).max(2200).nullable(),
  endYear: z.number().int().min(-10000).max(2200).nullable(),
  startDate: z.string().date().nullable().default(null),
  endDate: z.string().date().nullable().default(null),
  temporalStatus: z.enum(["developing", "retrospective", "unclear"]),
  basis: z.enum(["actions", "framing", "actions-and-framing"]),
  symbolic: narrativeAnnotationSchema.optional(),
  conflict: anchoredTextSchema,
  stakes: anchoredTextSchema,
  actors: z.array(z.object({
    id: key,
    name: z.string().trim().min(2).max(100),
    aliases: z.array(z.string().trim().min(2).max(100)).max(3).default([]),
    kind: z.enum(["person", "group", "institution"]),
    anchorIds: refs,
    claimedRole: anchoredTextSchema.nullable().default(null),
  })).min(2).max(6),
  resources: z.array(z.object({
    id: key,
    name: z.string().trim().min(3).max(100),
    kind: z.enum(["money", "information", "work", "access", "authority", "capacity", "safety", "attention", "other"]),
    anchorIds: refs,
  })).max(4),
  beats: z.array(z.object({
    id: key,
    when: z.string().trim().min(2).max(70),
    temporalBasis: z.enum(["occurred", "announced", "alleged"]).optional(),
    summary: z.string().trim().min(20).max(300),
    basis: z.enum(["documented-action", "reported-action", "attributed-claim"]),
    anchorIds: refs,
  })).min(2).max(6),
  relations: z.array(z.object({
    id: key,
    beatId: key,
    from: key,
    predicate: predicateSchema,
    to: key,
    layer: z.enum(["actions", "framing"]),
    // An accusation is a speech act. Its content is not an established action.
    allegedConduct: predicateSchema.nullable().default(null),
    anchorIds: refs,
  })).min(3).max(18),
  position: z.object({
    stage: z.enum(["beginning", "pressure", "decision", "aftermath", "unclear"]),
    observation: anchoredTextSchema,
  }).nullable().default(null),
  anchors: z.array(z.object({
    id: key,
    sourceId: z.string().min(1),
    passage: z.string().trim().min(18).max(320),
  })).min(1).max(18),
});
export type NarrativeEpisode = z.infer<typeof episodeSchema>;
export type EpisodeRelation = NarrativeEpisode["relations"][number];
export type EpisodeSource = { id: string; title: string; summary: string; kind?: string; exactPassages?: string[] };
export type AnchoredText = z.infer<typeof anchoredTextSchema>;

const filler = /\b(?:delve|tapestry|timeless|age-old|human condition|powerful reminder|serves as a|at its core|at the heart of|a story as old as|dance between|navigating the complexities|the story beneath the story|a tale of|custodian|gatekeeper)\b/i;
const unsupportedGeneralisation = /\b(?:inevitabl\w*|always|usually|typically|rarely|destined|history teaches|history shows|history repeats|humanity feels|collective unconscious proves)\b/i;
export function editorialProblems(text: string, attributed = false, standard: "baseline-1" | "plain-language-2" = "plain-language-2") {
  const problems: string[] = [];
  if (standard === "plain-language-2" && /\b(?:silent emptiness|named repayment|keyboard operators)\b/i.test(text)) problems.push("Use concrete, ordinary language instead of poetic or awkward stock phrasing.");
  if (filler.test(text)) problems.push("Replace stock phrasing or abstract role labels with specific actors and actions.");
  if (!attributed && unsupportedGeneralisation.test(text)) problems.push("An episode does not establish a general frequency, destiny or collective psychological fact.");
  if (text.split(/\s+/).length > 48) problems.push("Keep one observation below 49 words.");
  return problems;
}

/** Provenance and representation checks; semantic entailment still needs review. */
export function validateEpisode(value: unknown, sources: EpisodeSource[]): NarrativeEpisode {
  const episode = episodeSchema.parse(value);
  const sourceMap = new Map(sources.filter(s => s.kind !== "illustration").map(s => [s.id, s]));
  const anchors = new Map(episode.anchors.map(a => [a.id, a]));
  const nodes = [...episode.actors, ...episode.resources];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const actorIds = new Set(episode.actors.map(a => a.id));
  const beatIds = new Set(episode.beats.map(b => b.id));
  const unique = (ids: string[], what: string) => {
    if (new Set(ids).size !== ids.length) throw new Error(`${what} IDs must be unique.`);
  };
  unique(episode.anchors.map(a => a.id), "Anchor");
  unique(nodes.map(n => n.id), "Actor/resource");
  unique(episode.beats.map(b => b.id), "Beat");
  unique(episode.relations.map(r => r.id), "Relation");
  unique(episode.relations.map(r => [r.beatId, r.from, r.predicate, r.to, r.layer, r.allegedConduct].join(":")), "Relationship");
  const checkRefs = (ids: string[]) => {
    if (ids.some(id => !anchors.has(id))) throw new Error("An episode claim has an unresolved evidence anchor.");
  };
  for (const anchor of episode.anchors) {
    const source = sourceMap.get(anchor.sourceId);
    const quoteText = source?.exactPassages ? source.exactPassages.join("\n") : `${source?.title}. ${source?.summary}`;
    if (!source || !normaliseEvidenceText(quoteText).includes(normaliseEvidencePassage(anchor.passage)))
      throw new Error(`Episode ${episode.id}, anchor ${anchor.id} (${anchor.sourceId}): passage is absent from its allowed source. Copy a contiguous substring from that source; do not paraphrase or join sentences.`);
    if (anchor.passage.split(/\s+/).length > 25) throw new Error("Episode source quotations must stay below 26 words.");
  }
  for (const item of [episode.conflict, episode.stakes, ...nodes, ...episode.beats, ...episode.relations,
    ...episode.actors.flatMap(a => a.claimedRole ? [a.claimedRole] : []),
    ...(episode.position ? [episode.position.observation] : [])]) checkRefs(item.anchorIds);
  for (const actor of episode.actors) {
    const sourceText = actor.anchorIds.map(id => {
      const source = sourceMap.get(anchors.get(id)!.sourceId)!;
      return normaliseEvidenceText(`${source.title}. ${source.summary}`);
    });
    if (![actor.name, ...actor.aliases].some(name => sourceText.some(text => text.includes(normaliseEvidenceText(name)))))
      throw new Error(`Actor ${actor.name} is not named in its supporting sources.`);
  }
  if (episode.symbolic) {
    const symbolic = episode.symbolic;
    unique(symbolic.roles.map(r=>`${r.actorId}:${r.figure}:${r.basis}`), "Symbolic role");
    unique(symbolic.dynamics.map(d=>d.dynamic), "Symbolic dynamic");
    for (const role of symbolic.roles) if (!actorIds.has(role.actorId)) throw new Error("A symbolic role must refer to a named episode actor.");
    for (const item of [...symbolic.roles,...symbolic.dynamics,...(symbolic.arc?[symbolic.arc]:[])]) {
      checkRefs(item.observation.anchorIds);
      if (/\b(?:unconsciously|secretly wants|proves? the collective|destined|inevitable)\b/i.test(item.observation.text)) throw new Error("Symbolic observations cannot diagnose hidden motives or destiny.");
      if (editorialProblems(item.observation.text).length) throw new Error("Keep symbolic observations concrete and bounded.");
    }
    if (symbolic.arc && symbolic.arc.beatIds.some(id=>!beatIds.has(id))) throw new Error("A symbolic stage must refer to existing episode beats.");
  }
  for (const relation of episode.relations) {
    if (!beatIds.has(relation.beatId) || !actorIds.has(relation.from) || !nodeMap.has(relation.to) || relation.from === relation.to)
      throw new Error("Relations must join a named actor to another actor/resource in a known beat.");
    if ((relation.predicate === "accuses" || relation.predicate === "denies") && relation.layer !== "framing")
      throw new Error("Accusations and denials must remain attributed framing.");
    if (relation.predicate === "accuses" && !relation.allegedConduct)
      throw new Error("An accusation must specify the alleged conduct; it is not evidence that the target did it.");
    const resource = episode.resources.find(r => r.id === relation.to);
    if (episode.encoding === "typed-relations-2" && relation.predicate === "compromises" && (!resource || !["access", "information"].includes(resource.kind)))
      throw new Error(`Relation ${relation.id}: compromises means unauthorized access to a system, credential or information resource. Taking funds is removes; do not encode money or a person as a compromised system.`);
    if (episode.encoding === "typed-relations-2" && relation.predicate === "deceives" && !actorIds.has(relation.to)) throw new Error(`Relation ${relation.id}: deceives targets an actor, not a resource.`);
    if (episode.encoding === "typed-relations-2" && ["withholds", "restores"].includes(relation.predicate) && !resource) throw new Error(`Relation ${relation.id}: withholds/restores must identify the resource being withheld/restored.`);
  }
  for (const beat of episode.beats) {
    if (!episode.relations.some(r => r.beatId === beat.id)) throw new Error("Every beat needs an evidenced relationship.");
    const problems = editorialProblems(beat.summary, beat.basis === "attributed-claim");
    if (problems.length) throw new Error(problems.join(" "));
  }
  if (episode.startYear !== null && episode.endYear !== null && episode.startYear > episode.endYear)
    throw new Error("Episode dates are reversed.");
  for (const [date, year] of [[episode.startDate, episode.startYear], [episode.endDate, episode.endYear]] as const)
    if (date && (year === null || Number(date.slice(0, 4)) !== year)) throw new Error("An exact date must agree with its episode year.");
  if (episode.startDate && episode.endDate && episode.startDate > episode.endDate) throw new Error("Episode dates are reversed.");
  for (const text of [episode.conflict.text, episode.stakes.text, ...(episode.position ? [episode.position.observation.text] : [])]) {
    const problems = editorialProblems(text);
    if (problems.length) throw new Error(problems.join(" "));
  }
  return episode;
}
