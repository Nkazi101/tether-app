import test from "node:test";
import assert from "node:assert/strict";
import { episodeSchema, validateEpisode, editorialProblems } from "../src/lib/episodes";
import { matchEpisodes, rankEpisodes } from "../server/domain/structure-match";
import { validateAlignment } from "../src/lib/structural-alignment";
import { restoreSourceQuotationMarks } from "../server/domain/episode-quotations";
import { historicalSearchView } from "../server/domain/historical-search-view";

import { episode, sources } from "./fixtures/episodes";
test("a connected ordered mapping survives different names, topic and outcome", () => {
  const now = episode("now", 2026), then = episode("then", 1942);
  then.actors[0].name = "Unrelated institution";
  then.title = "A different domain, language and outcome";
  const match = matchEpisodes(now, then)!;
  assert.equal(match.counts.beats, 3);
  assert.equal(match.counts.predicates, 3);
  assert.equal(match.counts.actors, 2);
  assert.deepEqual(match, matchEpisodes(now, { ...then, title: "Another ending entirely" }));
});
test("shared vocabulary cannot compensate for changed direction or chronology", () => {
  const now = episode("now", 2026), then = episode("then", 1942);
  then.relations[2] = { ...then.relations[2], from: "workers", to: "firm" };
  assert.equal(matchEpisodes(now, then), null);
  const reordered = episode("then", 1942);
  reordered.beats.reverse();
  assert.equal(matchEpisodes(now, reordered), null);
});
test("one generic repeated action and a later episode are rejected", () => {
  const now = episode("now", 2026), then = episode("then", 1942);
  for (const item of [now, then]) item.relations.forEach(r => { r.predicate = "requests"; });
  assert.equal(matchEpisodes(now, then), null);
  assert.equal(matchEpisodes(episode("now", 2026), episode("future", 2027)), null);
  assert.equal(matchEpisodes(episode("now", 2026), episode("sameyear", 2026)), null);
});
test("persisted mappings cannot collapse actors or change counts", () => {
  const now = episode("now", 2026), then = episode("then", 1942);
  const map = matchEpisodes(now, then)!;
  assert.throws(() => validateAlignment({ ...map, nodes: map.nodes.map(n => ({ ...n, historical: "firm" })) }, now, then), /one-to-one/);
  assert.throws(() => validateAlignment({ ...map, counts: { ...map.counts, actors: 5 } }, now, then), /counts/);
  assert.equal(rankEpisodes(now, [{ episode: episode("future", 2027) }, { episode: then }])[0].candidate.episode.id, "then");
});
test("source anchors, actor identity and dates are checked separately from graph fit", () => {
  const item = episode("now", 2026);
  assert.equal(validateEpisode(item, sources).id, "now");
  assert.throws(() => validateEpisode({ ...item, anchors: [{ ...item.anchors[0], passage: "A quotation that never appeared here." }] }, sources), /absent/);
  assert.throws(() => validateEpisode({ ...item, actors: item.actors.map(a => ({ ...a, name: "Invented" })) }, sources), /not named/);
  assert.throws(() => validateEpisode({ ...item, startDate: "2025-10-01" }, sources), /agree/);
  assert.ok(editorialProblems("History shows that the custodian is usually destined to win.").length);
  assert.equal(editorialProblems("Workers stopped deliveries after the company rejected their pay request.").length, 0);
});
test("quotation restoration copies source punctuation and refuses wording edits or ambiguous occurrences", () => {
  const item = episode("now", 2026);
  const quoted = [{ ...sources[0], summary: 'Workers and Company negotiate over "new deliveries".' }];
  const repaired = restoreSourceQuotationMarks(item, quoted);
  assert.deepEqual(repaired.restored, ["a"]);
  assert.equal(repaired.episode.anchors[0].passage, quoted[0].summary);
  validateEpisode(repaired.episode, quoted);
  assert.equal(restoreSourceQuotationMarks(item, [{ ...quoted[0], summary: 'Workers and Company negotiate over "old deliveries".' }]).restored.length, 0);
  assert.equal(restoreSourceQuotationMarks(item, [{ ...quoted[0], summary: `${quoted[0].summary} ${quoted[0].summary}` }]).restored.length, 0);
  assert.equal(restoreSourceQuotationMarks(item, [{ ...quoted[0], summary: 'Workers and Company negotiate, over "new deliveries".' }]).restored.length, 0);
});
test("typed predicate contracts distinguish taking funds from compromising access without invalidating legacy episodes", () => {
  const item = episode("now", 2026);
  item.resources[0].kind = "money";
  item.relations[1].predicate = "compromises";
  assert.equal(validateEpisode(item, sources).encoding, "episode-1");
  assert.throws(() => validateEpisode({ ...item, encoding: "typed-relations-2" }, sources), /Taking funds/);
  item.relations[1].predicate = "removes";
  assert.equal(validateEpisode({ ...item, encoding: "typed-relations-2" }, sources).encoding, "typed-relations-2");
  const past = episode("past", 1942);
  assert.equal(matchEpisodes({ ...episode("now", 2026), encoding: "typed-relations-2" }, past), null);
});
test("discovery receives an anonymous graph that is unchanged by names, headline, topic and source prose", () => {
  const first = episode("first", 2026), second = structuredClone(first);
  second.id = "brand-name"; second.title = "Another company in a different industry";
  second.actors.forEach(a => { a.name = "Distinctive identity"; a.aliases = ["A brand"]; });
  second.resources.forEach(r => { r.name = "A topic-specific object"; });
  second.beats.forEach(b => { b.summary = "Different headline words describing the same directed action."; });
  assert.deepEqual(historicalSearchView(first), historicalSearchView(second));
  assert.ok(!JSON.stringify(historicalSearchView(second)).includes("Distinctive"));
});
test("adjacent windows tolerate different prose grouping while retaining three connected actions", () => {
  const now = episode("now", 2026), past = episode("past", 1942);
  // The first account groups its first two actions; the other tells them separately.
  now.relations[1].beatId = "b1";
  now.beats.splice(1, 1);
  const match = matchEpisodes(now, past)!;
  assert.ok(match);
  assert.equal(match.counts.predicates, 3);
  assert.equal(match.counts.beats, 2);
  assert.equal(match.counts.currentBeats, 2);
  assert.equal(match.counts.historicalBeats, 3);
  assert.ok(match.beats.some(row => row.historicalBeatIds.length === 2));
  const reversed = structuredClone(past); reversed.beats.reverse();
  assert.equal(matchEpisodes(episode("now", 2026), reversed), null);
});
test("an agent-authored source summary cannot be presented as a publisher quotation", () => {
  const item = episode("now", 2026);
  assert.throws(() => validateEpisode(item, [{ ...sources[0], exactPassages: ["A different actual excerpt from the publisher."] }]), /absent/);
  assert.equal(validateEpisode(item, [{ ...sources[0], exactPassages: [sources[0].summary] }]).id, "now");
});

test("later connecting actions can join initially separate strands without discarding a valid parallel", () => {
  const now = episode("now", 2026), past = episode("past", 1942);
  for (const item of [now, past]) {
    item.resources.push({ id: "records", name: "company records", kind: "information", anchorIds: ["a"] }, { id: "entry", name: "site entry", kind: "access", anchorIds: ["a"] });
    item.beats.push({ ...item.beats[2], id: "b4", when: "Finally" });
    item.relations = [
      { ...item.relations[0], from: "firm", predicate: "controls", to: "records" },
      { ...item.relations[1], from: "workers", predicate: "withholds", to: "deliveries" },
      { ...item.relations[1], id: "r3", beatId: "b3", from: "workers", predicate: "withholds", to: "entry" },
      { ...item.relations[0], id: "r4", beatId: "b4", from: "firm", predicate: "requests", to: "deliveries" },
    ];
  }
  const match = matchEpisodes(now, past);
  assert.ok(match, "The final request connects the two strands. A partial prefix need not be connected.");
  assert.equal(match.counts.relations, 4);
  assert.equal(match.counts.predicates, 3);
  assert.equal(match.counts.currentBeats, 4);
  validateAlignment(match, now, past);
  past.relations[3].to = "records";
  assert.equal(matchEpisodes(now, past), null, "A disconnected final graph must still be rejected.");
});

test('announced future actions cannot be silently mapped to completed actions',()=>{
 const now=episode('now',2026),past=episode('past',1942);
 now.beats.forEach(b=>b.temporalBasis='announced');past.beats.forEach(b=>b.temporalBasis='occurred');
 assert.equal(matchEpisodes(now,past),null);
 past.beats.forEach(b=>b.temporalBasis='announced');assert.ok(matchEpisodes(now,past));
});
