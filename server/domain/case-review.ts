import { z } from "zod";
import { caseSchema } from "../../src/lib/comparison";
import { independentHistoricalSources, hasHistoricalFoundation } from "./source-quality";
import { validateEpisode } from "../../src/lib/episodes";
import {validateHistoricalRecord} from '../../src/lib/narrative-comparison';

export const casePublicationSchema = z
  .object({
    historicalCase: caseSchema,
    reviewer: z.string().trim().min(3).max(200),
    reviewedAt: z.string().datetime(),
    notes: z.string().trim().min(30).max(4000),
    support: z
      .array(
        z.object({
          signal: caseSchema.shape.signals.element,
          sourceId: z.string(),
          passage: z.string().min(12).max(1200),
        }),
      )
      .max(30),
  })
  .strict();

export function validateCasePublication(value: unknown) {
  const result = casePublicationSchema.parse(value);
  const item = result.historicalCase;
  if(item.narrativeRecord){validateHistoricalRecord(item.narrativeRecord,item.sources);if(!hasHistoricalFoundation(item.sources))throw new Error('Context records need identified original or scholarly evidence.');}
  if (item.version.startsWith("episode3:") && !hasHistoricalFoundation(item.sources)) throw new Error("A new encoded case needs an identified original or scholarly source.");
  if (item.episode) {
    validateEpisode(item.episode, item.sources);
    if (independentHistoricalSources(item.sources.filter(s => item.episode!.anchors.some(a => a.sourceId === s.id))).length < 2)
      throw new Error("A published episode needs anchors from two independent historical source origins.");
  }
  if (!item.sources.length || !item.boundaries.length || (["source-checked","web-researched"].includes(item.review) && !item.sequence.length))
    throw new Error(
      "A case needs sources, a dated sequence and material boundaries.",
    );
  const sources = new Map(item.sources.map((source) => [source.id, source]));
  if (sources.size !== item.sources.length)
    throw new Error("Case source IDs must be unique.");
  if (
    ["source-checked", "web-researched"].includes(item.review) &&
    independentHistoricalSources(item.sources).length < 2
  )
    throw new Error(
      "Historical case sources repeat one origin or substantially copied account; another independent account is required.",
    );
  for (const id of [
    ...item.sequence.flatMap((stage) => stage.sourceIds),
    ...(item.narrative?.sourceIds || []),
  ]) {
    if (!sources.has(id))
      throw new Error("Every historical claim must resolve to a case source.");
  }
  for (const support of result.support) {
    const source = sources.get(support.sourceId);
    if (!source || !source.summary.includes(support.passage))
      throw new Error(
        "Each support passage must occur in the stored source summary.",
      );
    if (!item.signals.includes(support.signal))
      throw new Error("Support must refer to a signal used by this case.");
  }
  if (item.review === "source-checked") {
    const publishers = new Set(
      item.sources
        .filter((source) => source.url)
        .map((source) => source.publisher.trim().toLowerCase()),
    );
    if (publishers.size < 2)
      throw new Error(
        "Source-checked publication requires at least two distinct publishers; independence still needs editorial judgment.",
      );
    if (
      item.signals.length < 2 ||
      item.signals.some(
        (signal) =>
          !result.support.some((support) => support.signal === signal),
      )
    )
      throw new Error(
        "Source-checked publication requires documented support for every relationship.",
      );
  }
  if (Date.parse(result.reviewedAt) > Date.now() + 60000)
    throw new Error("A review cannot be dated in the future.");
  return result;
}
