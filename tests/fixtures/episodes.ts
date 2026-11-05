import { episodeSchema } from "../../src/lib/episodes";
export function episode(id: string, year: number) {
  const anchorIds = ["a"];
  return episodeSchema.parse({
    version: 1, id, title: `${id} workers stop deliveries`, period: String(year), startYear: year, endYear: year,
    temporalStatus: "developing", basis: "actions", conflict: { text: "Workers seek a larger share of receipts.", anchorIds }, stakes: { text: "The company needs new deliveries to operate.", anchorIds },
    actors: [{ id: "workers", name: "Workers", kind: "group", anchorIds }, { id: "firm", name: "Company", kind: "institution", anchorIds }],
    resources: [{ id: "deliveries", name: "new deliveries", kind: "work", anchorIds }],
    beats: [
      { id: "b1", when: "First", summary: "The company depends on workers for new deliveries.", basis: "reported-action", anchorIds },
      { id: "b2", when: "Next", summary: "Workers withhold new deliveries from the company.", basis: "reported-action", anchorIds },
      { id: "b3", when: "Later", summary: "The company negotiates with the workers over pay.", basis: "reported-action", anchorIds },
    ],
    relations: [
      { id: "r1", beatId: "b1", from: "firm", predicate: "depends", to: "deliveries", layer: "actions", anchorIds },
      { id: "r2", beatId: "b2", from: "workers", predicate: "withholds", to: "deliveries", layer: "actions", anchorIds },
      { id: "r3", beatId: "b3", from: "firm", predicate: "negotiates", to: "workers", layer: "actions", anchorIds },
    ], anchors: [{ id: "a", sourceId: "s", passage: "Workers and Company negotiate over new deliveries." }],
  });
}
export const sources = [{ id: "s", title: "Workers and Company negotiate", summary: "Workers and Company negotiate over new deliveries." }];
