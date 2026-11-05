import type { PairedStory } from "../../src/lib/paired-story";
import { episode, sources } from "./episodes";
import { sourceSchema } from "../../src/lib/comparison";
import { buildComparison } from "../../server/domain/compare";
import { randomUUID } from "node:crypto";
export function pairFixture() {
  const now = episode("current", 2026), past = episode("earlier", 1942);
  past.anchors.push({ id: "b", sourceId: "archive2", passage: sources[0].summary });
  past.anchors[0].sourceId = "archive1";
  past.beats[2].anchorIds = ["b"];
  past.relations[2].anchorIds = ["b"];
  const makeSource = (id: string, kind: "reporting" | "historical-reference") => sourceSchema.parse({ ...sources[0], id, kind, publisher: id, url: `https://${id}.org/incident`, publishedAt: "2026-11-01T00:00:00Z", retrievedAt: new Date().toISOString(), retrieval: "source-page" });
  const currentSource = makeSource("s", "reporting");
  const historical = [makeSource("archive1", "historical-reference"), makeSource("archive2", "historical-reference")];
  // Keep the source accounts independent under the copied-account heuristic.
  historical[0].historicalProvenance = { role: "original-analysis", checkedBy: "agent-source-audit", basisPassage: null, note: "Synthetic original-source role for this isolated test fixture only." };
  historical[1].summary += " A separate short archival record.";
  const base = buildComparison({ situationId: randomUUID(), snapshotId: randomUUID(), title: "Workers stop new deliveries", question: "What does a historical comparison reveal?", sources: [currentSource], cases: [], mode: "reporting" });
  const reading: PairedStory["reading"] = {
    shared: { text: "Workers withhold the deliveries the company needs, then the two sides negotiate.", currentBeatIds: ["b1", "b2", "b3"], historicalBeatIds: ["b1", "b2", "b3"] },
    differences: [{ now: { text: "Workers are described as an informal group.", anchorIds: ["a"] }, then: { text: "The earlier account identifies a recognised union.", anchorIds: ["b"] }, implication: "The present group may lack the authority to negotiate a binding agreement for all workers." }],
    alternative: { text: "The company may be negotiating because it needs deliveries, rather than because it accepts the workers’ demands.", currentAnchorIds: ["a"], historicalAnchorIds: ["b"] }, continuation: null,
  };
  return { now, past, currentSource, historical, base, reading };
}

