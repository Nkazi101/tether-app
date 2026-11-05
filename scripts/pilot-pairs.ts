/** Bounded public implementation pilot; never reuses the completed v5 refresh ledger. */
import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { Store, jobSchema, hash } from "../server/services/store";
import { runOneJob } from "../server/worker";
import { RESEARCH_VERSION, researchHistory, historicalPacketSchema, historicalPacketKey, encodedPacketSchema } from "../server/services/episode-research";
import { readSearchTrace } from "../server/services/research";
import type { NarrativeEpisode } from "../src/lib/episodes";
import type { StructuralAlignment } from "../src/lib/structural-alignment";
import { validateEpisode } from "../src/lib/episodes";
import { restoreSourceQuotationMarks } from "../server/domain/episode-quotations";
import { independentHistoricalSources } from "../server/domain/source-quality";
import { sourceSchema } from "../src/lib/comparison";

dotenv.config({ path: ".env.local", override: true, quiet: true }); dotenv.config({ quiet: true });
const directory = resolve("audit/episode-pilot"); mkdirSync(directory, { recursive: true });
const filename = resolve(directory, "manifest.json");
type Manifest = { id: string; version: string; requestedIds?: string[]; calls: number; reserved: number; observed: number; maxCalls: number; maxReserved: number; targets: Array<{ jobId: string; previousJobIds?: string[]; cacheFile?: string; currentChecked?: boolean; encodedFile?: string; reviewFile?: string; editorialFile?: string; verifiedSourceFile?: string; historicalProposalFile?: string; finalRevisionFile?: string; analysisId: string; situationId: string; title: string }> };
const db = getSupabaseServerClient(), plain = new Store(db);
const save = (value: Manifest) => { writeFileSync(filename + ".tmp", JSON.stringify(value, null, 2)); renameSync(filename + ".tmp", filename); };
const load = (): Manifest => JSON.parse(readFileSync(filename, "utf8"));
const context = new AsyncLocalStorage<{ jobId: string }>();
const mode = process.argv[2];
function extractPacket(text: string, marker: string) {
  const at = text.indexOf(marker); if (at < 0) return null;
  let start = at + marker.length; while (/\s/.test(text[start])) start++;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") if (--depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("The captured source packet is incomplete.");
}
if (mode === "prepare") {
  const ids = (process.argv.find(a => a.startsWith("--ids=")) || "").slice(6).split(",").filter(Boolean);
  if (!ids.length || ids.length > 8) throw new Error("Supply 1–8 explicitly selected public analysis IDs with --ids=.");
  const manifest: Manifest = existsSync(filename) ? load() : { id: `episode-pilot-${randomUUID()}`, version: RESEARCH_VERSION, calls: 0, reserved: 0, observed: 0, maxCalls: 64, maxReserved: 4_000_000, targets: [] };
  if (manifest.calls || (manifest.requestedIds && JSON.stringify(manifest.requestedIds) !== JSON.stringify(ids))) throw new Error("Cannot change a prepared pilot or reset its budget.");
  manifest.requestedIds = ids;
  // Save before enqueueing; an interrupted preparation can be audited, never silently redone.
  save(manifest);
  for (const id of ids) {
    if (manifest.targets.some(t => t.analysisId === id)) continue;
    const previous = await plain.analysis(id);
    const situation = previous && await plain.situation(previous.situationId);
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:") || situation.latest_analysis_id !== id) throw new Error("Pilot target must be a current system-owned public analysis.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    manifest.targets.push({ jobId: job.id, analysisId: id, situationId: situation.id, title: previous.title }); save(manifest);
  }
  console.log(JSON.stringify({ targets: manifest.targets.length, maxCalls: manifest.maxCalls, maxReserved: manifest.maxReserved }));
} else if (mode === "reassess") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot before reassessing its representation.");
  const manifest = load();
  const ids = (process.argv.find(a => a.startsWith("--ids=")) || "").slice(6).split(",").filter(Boolean);
  if (!ids.length || ids.some(id => !manifest.targets.some(t => t.analysisId === id))) throw new Error("Reassessment is limited to the original pilot targets.");
  for (const id of ids) {
    const target = manifest.targets.find(t => t.analysisId === id)!;
    if (target.previousJobIds?.length) continue; // At most one implementation repair per target; no budget reset.
    const situation = await plain.situation(target.situationId);
    const previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:")) throw new Error("The public pilot target is unavailable.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:representation-repair:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [target.jobId]; target.jobId = job.id; save(manifest);
  }
  console.log(JSON.stringify({ repairedTargets: ids.length, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "reencode") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load();
  const ids = (process.argv.find(a => a.startsWith("--ids=")) || "").slice(6).split(",").filter(Boolean);
  if (!ids.length || ids.length > 2 || ids.some(id => !manifest.targets.some(t => t.analysisId === id))) throw new Error("Source re-encoding is bounded to two original public pilot targets.");
  for (const id of ids) {
    const target = manifest.targets.find(t => t.analysisId === id)!; if (target.cacheFile) continue;
    const files = readdirSync(directory).filter(n => n.startsWith(target.jobId)).sort();
    let currentPacket: unknown = null, sources: unknown = null, trace: ReturnType<typeof readSearchTrace> | null = null, searchedAt = "";
    for (const file of files) {
      const value = JSON.parse(readFileSync(resolve(directory, file), "utf8"));
      if (file.endsWith("-request.json")) {
        const prompt = value.messages?.[0]?.content;
        if (prompt) { currentPacket ||= extractPacket(prompt, "\nCURRENT:"); sources ||= extractPacket(prompt, "\nREAD SOURCES:"); }
      } else if (file.endsWith("-response.json") && value.output?.some((b: { type: string }) => b.type === "web_search_call")) {
        trace = readSearchTrace(value); searchedAt = new Date(Number(file.match(/-(\d+)-response\.json$/)![1])).toISOString();
      }
    }
    if (!currentPacket || !Array.isArray(sources) || !trace?.searched || !trace.queries.length) throw new Error("A complete real search trace and read-source packet are required.");
    const cached = historicalPacketSchema.parse({ currentFingerprint: hash(currentPacket), depth: 1, searchedAt, queries: trace.queries, sourcesLocated: trace.urls.length, report: trace.text.slice(0, 14000), sources: sources.map(s => sourceSchema.parse({ ...s, publisher: new URL(s.url).hostname, retrievedAt: searchedAt, kind: "historical-reference", retrieval: "source-page" })) });
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:") || historicalPacketKey(previous.sources) !== cached.currentFingerprint) throw new Error("The unchanged public evidence could not be verified.");
    const cacheFile = `${id}-retained-sources.json`;
    if (existsSync(resolve(directory, cacheFile))) {
      if (hash(JSON.parse(readFileSync(resolve(directory, cacheFile), "utf8"))) !== hash(cached)) throw new Error("Retained source receipts changed; refuse to overwrite them.");
    } else writeFileSync(resolve(directory, cacheFile), JSON.stringify(cached, null, 2), { flag: "wx" });
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:typed-source-reencoding:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.cacheFile = cacheFile; save(manifest);
  }
  console.log(JSON.stringify({ reencodedTargets: ids.length, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "sourcecheck") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load();
  const ids = (process.argv.find(a => a.startsWith("--ids=")) || "").slice(6).split(",").filter(Boolean);
  if (!ids.length || ids.length > 2 || ids.some(id => !manifest.targets.some(t => t.analysisId === id && t.cacheFile))) throw new Error("Source checking is limited to two retained public evidence packets.");
  for (const id of ids) {
    const target = manifest.targets.find(t => t.analysisId === id)!; if (target.currentChecked) continue;
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    const cached = historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, target.cacheFile!), "utf8")));
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:") || historicalPacketKey(previous.sources) !== cached.currentFingerprint) throw new Error("Unchanged public evidence verification failed.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:current-source-check:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.currentChecked = true; save(manifest);
  }
  console.log(JSON.stringify({ sourceCheckedTargets: ids.length, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "rerank") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const id = (process.argv.find(a => a.startsWith("--id=")) || "").slice(5);
  const target = manifest.targets.find(t => t.analysisId === id && t.currentChecked && t.cacheFile);
  if (!target) throw new Error("Reranking requires an original source-checked pilot target with retained evidence.");
  if (!target.encodedFile) {
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    const cached = historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, target.cacheFile!), "utf8")));
    if (!previous || !previous.currentEpisode || previous.research?.currentReview !== "model-checked" || hash(previous.currentEpisode) !== previous.research.frozenEpisodeHash || !situation?.is_public || !situation.owner_key.startsWith("system:") || historicalPacketKey(previous.sources) !== cached.currentFingerprint) throw new Error("Frozen pre-history extraction verification failed.");
    const episodes = new Map();
    for (const file of readdirSync(directory).filter(n => n.startsWith(target.jobId) && n.endsWith("-response.json")).sort()) {
      const raw = JSON.parse(readFileSync(resolve(directory, file), "utf8")); let value;
      try { value = JSON.parse(raw.choices?.[0]?.message?.content || "null"); } catch { continue; }
      for (const candidate of value?.candidates || []) {
        try {
          if (!candidate?.episode) continue;
          const sourceIds = new Set(candidate.episode.anchors.map((a: { sourceId: string }) => a.sourceId));
          const sources = cached.sources.filter(s => sourceIds.has(s.id));
          if (sources.length !== sourceIds.size || independentHistoricalSources(sources).length < 2) continue;
          const episode = validateEpisode(restoreSourceQuotationMarks({ ...candidate.episode, encoding: "typed-relations-2" }, sources).episode, sources);
          episodes.set(episode.id, episode);
        } catch { /* Keep invalid original receipts; never relax a source check. */ }
      }
    }
    const encoded = encodedPacketSchema.parse({ current: previous.currentEpisode, historical: [...episodes.values()] });
    const encodedFile = `${id}-retained-encoding.json`; writeFileSync(resolve(directory, encodedFile), JSON.stringify(encoded, null, 2), { flag: "wx" });
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:window-alignment:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.encodedFile = encodedFile; save(manifest);
  }
  console.log(JSON.stringify({ rerankedTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "review") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const id = (process.argv.find(a => a.startsWith("--id=")) || "").slice(5);
  const target = manifest.targets.find(t => t.analysisId === id && t.encodedFile && t.cacheFile);
  if (!target) throw new Error("Review requires the original retained source-encoded pilot target.");
  if (!target.reviewFile) {
    let pair = null;
    for (const file of readdirSync(directory).filter(n => n.startsWith(target.jobId) && n.endsWith("-request.json")).sort()) {
      const request = JSON.parse(readFileSync(resolve(directory, file), "utf8"));
      const prompt = request.messages?.[0]?.content;
      if (prompt?.includes("\nPAIR:")) pair = extractPacket(prompt, "\nPAIR:");
    }
    if (!pair) throw new Error("An actual prior full claim-review request is required.");
    const reviewFile = `${id}-retained-reading.json`; writeFileSync(resolve(directory, reviewFile), JSON.stringify(pair, null, 2), { flag: "wx" });
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:")) throw new Error("The public target is unavailable.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:optional-claim-withholding:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.reviewFile = reviewFile; save(manifest);
  }
  console.log(JSON.stringify({ reviewedTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "editorial") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const id = (process.argv.find(a => a.startsWith("--id=")) || "").slice(5);
  const target = manifest.targets.find(t => t.analysisId === id && t.encodedFile && t.cacheFile && t.reviewFile);
  if (!target) throw new Error("Editorial review is limited to the original retained pilot.");
  if (!target.editorialFile) {
    const editorialFile = `${id}-editorial-reading.json`;
    const pair = JSON.parse(readFileSync(resolve(directory, editorialFile), "utf8"));
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous || !situation?.is_public || !situation.owner_key.startsWith("system:") || !previous.pairedStory || hash(pair.current) !== hash(previous.pairedStory.current) || hash(pair.historical) !== hash(previous.pairedStory.historical) || hash(pair.alignment) !== hash(previous.pairedStory.alignment)) throw new Error("An editorial pass cannot rewrite the frozen events or structural match.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:editorial-copy:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.editorialFile = editorialFile; save(manifest);
  }
  console.log(JSON.stringify({ editorialTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "verify-sources") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const id = (process.argv.find(a => a.startsWith("--id=")) || "").slice(5);
  const target = manifest.targets.find(t => t.analysisId === id && t.currentChecked);
  if (!target) throw new Error("Source verification is restricted to a frozen original pilot target.");
  if (!target.verifiedSourceFile) {
    const verifiedSourceFile = "original-source-packet.json";
    const cached = historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, verifiedSourceFile), "utf8")));
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous || !previous.currentEpisode || previous.research?.currentReview !== "model-checked" || hash(previous.currentEpisode) !== previous.research.frozenEpisodeHash || !situation?.is_public || !situation.owner_key.startsWith("system:") || historicalPacketKey(previous.sources) !== cached.currentFingerprint) throw new Error("Unchanged, source-checked current episode verification failed.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:original-source-verification:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.verifiedSourceFile = verifiedSourceFile; save(manifest);
  }
  console.log(JSON.stringify({ originalSourceTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "repair-history") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const id = (process.argv.find(a => a.startsWith("--id=")) || "").slice(5);
  const target = manifest.targets.find(t => t.analysisId === id && t.verifiedSourceFile && t.currentChecked);
  if (!target || manifest.calls > manifest.maxCalls - 2) throw new Error("This bounded source correction requires the original target and two remaining reservations.");
  if (!target.historicalProposalFile) {
    const files = readdirSync(directory).filter(n => n.startsWith(target.jobId) && n.endsWith("-response.json"));
    if (files.length !== 1) throw new Error("Expected the single original-source historical encoding response.");
    const response = JSON.parse(readFileSync(resolve(directory, files[0]), "utf8"));
    const proposals = JSON.parse(response.choices[0].message.content).candidates.map((c: { episode: NarrativeEpisode }) => c.episode);
    const cached = historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, target.verifiedSourceFile!), "utf8")));
    const validated = proposals.map((episode: NarrativeEpisode) => validateEpisode(restoreSourceQuotationMarks({ ...episode, encoding: "typed-relations-2" }, cached.sources).episode, cached.sources));
    const historicalProposalFile = `${id}-unreviewed-historical-proposals.json`;
    writeFileSync(resolve(directory, historicalProposalFile), JSON.stringify(validated, null, 2), { flag: "wx" });
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous?.currentEpisode || previous.research?.currentReview !== "model-checked" || hash(previous.currentEpisode) !== previous.research.frozenEpisodeHash || !situation?.is_public || !situation.owner_key.startsWith("system:") || historicalPacketKey(previous.sources) !== cached.currentFingerprint) throw new Error("Frozen current source check failed.");
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:historical-source-correction:${id}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.historicalProposalFile = historicalProposalFile; save(manifest);
  }
  console.log(JSON.stringify({ correctionTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "finalize") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(); const target = manifest.targets.find(t => t.analysisId === "d68db158-0c65-4192-8b4e-f154bde5a6ee" && t.historicalProposalFile);
  if (!target || manifest.calls >= manifest.maxCalls) throw new Error("The final source-qualified pilot edit requires a remaining reservation.");
  if (!target.finalRevisionFile) {
    const situation = await plain.situation(target.situationId), previous = situation?.latest_analysis_id ? await plain.analysis(situation.latest_analysis_id) : null;
    if (!previous?.pairedStory || previous.research?.historicalReview !== "model-checked" || !situation?.is_public || !situation.owner_key.startsWith("system:")) throw new Error("A checked public pair is required.");
    const historicalCache = historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, target.verifiedSourceFile!), "utf8")));
    for (const source of historicalCache.sources) {
      if (source.publisher === "Elliptic") source.publishedAt = "2022-03-29T12:00:00.000Z";
      if (source.url?.includes("fbi.gov")) source.publishedAt = "2022-04-14T12:00:00.000Z";
    }
    const readingCache = structuredClone(previous.pairedStory);
    readingCache.reading.differences[0] = {
      now: { text: "Binance says the attackers used a compromised employee computer and an internal AI tool to reach its cryptocurrency wallets.", anchorIds: previous.pairedStory.reading.differences[0].now.anchorIds },
      then: { text: "Ronin’s attackers obtained validator keys and used a delegation that had not been revoked to complete the bridge’s required approvals.", anchorIds: ["a3", "a4"] },
      implication: "In Ronin, unrevoked signing authority helped complete the theft. That is a different permission failure from control through an internal AI tool; the earlier case does not establish which safeguards would stop today’s attack."
    };
    const finalRevisionFile = `${target.analysisId}-final-reviewed-proposal.json`;
    writeFileSync(resolve(directory, finalRevisionFile), JSON.stringify({ reviewedSnapshotId: previous.id, historicalCache, encodedCache: { current: previous.currentEpisode, historical: [previous.primary!.episode] }, readingCache }, null, 2), { flag: "wx" });
    const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:final-source-qualified-edit:${target.analysisId}`, p_owner: situation.owner_key, p_user: null,
      p_payload: { input: previous.title, question: previous.question, situationId: situation.id, researchFrom: previous.id, sources: previous.sources, depth: 1, forceReassessment: true },
      p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
    target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; target.finalRevisionFile = finalRevisionFile; save(manifest);
  }
  console.log(JSON.stringify({ finalEditTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "cache-retry") {
  if (existsSync(resolve(directory, "run.lock"))) throw new Error("Finish the active pilot first.");
  const manifest = load(), target = manifest.targets.find(t => t.finalRevisionFile);
  if (!target || manifest.calls >= manifest.maxCalls) throw new Error("No bounded final edit remains.");
  const path = resolve(directory, target.finalRevisionFile!);
  const revision = JSON.parse(readFileSync(path, "utf8"));
  const original = JSON.parse(readFileSync(resolve(directory, "published-example.json"), "utf8"));
  const retained = await plain.analysis(original.id);
  if (!retained?.pairedStory || retained.research?.historicalReview !== "model-checked" || hash(retained.primary?.episode) !== hash(revision.encodedCache.historical[0])) throw new Error("The original reviewed database snapshot is required.");
  revision.reviewedSnapshotId = retained.id;
  writeFileSync(path, JSON.stringify(revision, null, 2));
  const situation = await plain.situation(target.situationId);
  if (!situation?.is_public || !situation.owner_key.startsWith("system:")) throw new Error("Public system target required.");
  const job = jobSchema.parse(await plain.rpc("tether_enqueue", { p_kind: "research", p_key: `${manifest.id}:retained-snapshot-proof:${target.analysisId}`, p_owner: situation.owner_key, p_user: null,
    p_payload: { input: retained.title, question: retained.question, situationId: situation.id, researchFrom: retained.id, sources: retained.sources, depth: 1, forceReassessment: true },
    p_ip: manifest.id, p_user_limit: 2000, p_ip_limit: 2000, p_global_limit: 5000 }));
  target.previousJobIds = [...(target.previousJobIds || []), target.jobId]; target.jobId = job.id; save(manifest);
  console.log(JSON.stringify({ retryTargets: 1, callsRetained: manifest.calls, callCap: manifest.maxCalls }));
} else if (mode === "run") {
  const lock = resolve(directory, "run.lock");
  const fd = openSync(lock, "wx"); writeFileSync(fd, String(process.pid)); closeSync(fd);
  const manifest = load(), allowed = new Set(manifest.targets.map(t => t.jobId));
  if (manifest.version !== RESEARCH_VERSION) throw new Error("Pilot research version changed.");
  class PilotStore extends Store {
    override async claim() { const job = await super.claim(); if (job && allowed.has(job.id)) context.getStore()!.jobId = job.id; return job; }
    override async rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
      if (name === "tether_reserve_model" && allowed.has(context.getStore()?.jobId || "") && String(args.p_key).startsWith("model:")) {
        const suffix = String(args.p_key).slice(6), amount = Number(args.p_amount);
        // Single-process lock + synchronous durable reservation BEFORE provider dispatch.
        // Lifetime totals do not reset at UTC midnight or on resume.
        if (suffix === "background-calls") return true as T;
        if (suffix === "calls") { if (manifest.calls + amount > manifest.maxCalls) return false as T; manifest.calls += amount; }
        else if (suffix === "reserved-tokens") { if (manifest.reserved + amount > manifest.maxReserved) return false as T; manifest.reserved += amount; }
        else if (suffix === "observed-tokens") manifest.observed += amount;
        else throw new Error("Unrecognized pilot budget category.");
        save(manifest);
        return super.rpc<T>(name, { ...args, p_key: `${manifest.id}:${suffix}`, p_limit: 1_000_000_000 });
      }
      return super.rpc<T>(name, args);
    }
  }
  const originalFetch = globalThis.fetch;
  const endpoint = (process.env.MUSE_API_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "");
  globalThis.fetch = async (url, init) => {
    const result = await originalFetch(url, init);
    const id = context.getStore()?.jobId;
    if (id && allowed.has(id) && String(url).startsWith(endpoint) && init?.method === "POST") {
      const path = resolve(directory, `${id}-${Date.now()}`);
      writeFileSync(path + "-request.json", String(init.body));
      writeFileSync(path + "-response.json", await result.clone().text());
    }
    return result;
  };
  const beat = () => plain.rpc("tether_heartbeat", { p_instance: manifest.id, p_kind: "worker" });
  await beat(); const heartbeat = setInterval(() => { void beat().catch(() => {}); }, 30000);
  try {
    // Two sequential lanes; ordinary jobs retain ordinary limits and are never captured.
    await Promise.all([0, 1].map(async () => { const store = new PilotStore(db); for (let n = 0; n < 20; n++) if (!(await context.run({ jobId: "" }, () => runOneJob(store, { researchHistory: async (...args) => {
      const target = manifest.targets.find(t => t.jobId === context.getStore()?.jobId);
      const historyFile = target?.verifiedSourceFile || target?.cacheFile;
      const historicalCache = historyFile ? historicalPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, historyFile), "utf8"))) : undefined;
      const encodedCache = !target?.verifiedSourceFile && target?.encodedFile ? encodedPacketSchema.parse(JSON.parse(readFileSync(resolve(directory, target.encodedFile), "utf8"))) : undefined;
      const readingFile = target?.editorialFile || target?.reviewFile;
      const readingCache = !target?.verifiedSourceFile && readingFile ? JSON.parse(readFileSync(resolve(directory, readingFile), "utf8")) : undefined;
      const previous = target?.verifiedSourceFile && await plain.analysis(String((await plain.job(target.jobId, "system:reporting"))?.payload.researchFrom));
      const frozenCurrentCache = previous ? previous.currentEpisode || undefined : undefined;
      const historicalCandidatesCache = target?.historicalProposalFile ? JSON.parse(readFileSync(resolve(directory, target.historicalProposalFile), "utf8")) : undefined;
      // Agent-authored pilot copy, not a general production template. The independent full-pair
      // claim review still runs, and no actor, relation or map is changed by this editor.
      const composeReading = historicalCandidatesCache ? (current: NarrativeEpisode, historical: NarrativeEpisode, alignment: StructuralAlignment) => {
        if (target?.analysisId !== "d68db158-0c65-4192-8b4e-f154bde5a6ee" || historical.id !== "ronin-bridge-heist-2022") throw new Error("This editorial pass is restricted to the audited pilot case.");
        const currentAnchor = (text: string) => { const anchor = current.anchors.find(a => a.passage.includes(text)); if (!anchor) throw new Error("Editorial evidence absent."); return anchor.id; };
        const historicalAccess = historical.relations.find(r => r.predicate === "compromises");
        if (!historicalAccess) throw new Error("The source-checked historical access relation is missing.");
        const last = historical.beats.findIndex(b => b.id === alignment.beats.at(-1)!.historicalBeatIds.at(-1));
        const later = historical.beats.slice(last + 1).filter(b => b.basis === "attributed-claim");
        return {
          shared: { text: "In both reported accounts, a fake job approach to an employee created access that attackers later used to steal funds.", currentBeatIds: [...new Set(alignment.beats.flatMap(b => b.currentBeatIds))], historicalBeatIds: [...new Set(alignment.beats.flatMap(b => b.historicalBeatIds))] },
          differences: [{ now: { text: "Binance says the attackers used a compromised employee computer and an internal AI tool to reach its cryptocurrency wallets.", anchorIds: [currentAnchor("internal AI tool")] }, then: { text: "Ronin’s attackers gained access to signing keys used to authorize bridge transfers.", anchorIds: historicalAccess.anchorIds }, implication: "The entry method is shared. The devices and permissions that turned that access into theft were different, so the earlier case explains only part of today’s attack." }],
          alternative: { text: "Different attackers could reuse the same technique. The matching sequence alone cannot establish who carried out either attack.", currentAnchorIds: [currentAnchor("internal AI tool")], historicalAnchorIds: historicalAccess.anchorIds },
          continuation: later.length ? { historicalBeatIds: later.map(b => b.id), implication: null } : null,
        };
      } : undefined;
      if (target?.finalRevisionFile) {
        const revision = JSON.parse(readFileSync(resolve(directory, target.finalRevisionFile), "utf8"));
        return researchHistory(args[0], args[1], args[2], args[3], args[4], { historicalCache: historicalPacketSchema.parse(revision.historicalCache), encodedCache: encodedPacketSchema.parse(revision.encodedCache), readingCache: revision.readingCache, retainedSnapshot: await plain.analysis(revision.reviewedSnapshotId) || undefined });
      }
      return researchHistory(args[0], args[1], args[2], args[3], args[4], { historicalCache, encodedCache, readingCache, frozenCurrentCache, historicalCandidatesCache, composeReading });
    } })))) break; }));
  } finally { globalThis.fetch = originalFetch; clearInterval(heartbeat); unlinkSync(lock); }
  console.log(JSON.stringify({ calls: manifest.calls, reserved: manifest.reserved, observed: manifest.observed }));
} else if (mode === "status") {
  const manifest = load();
  const { data, error } = await db.from("tether_jobs").select("id,status,result_id,error_message").in("id", manifest.targets.map(t => t.jobId));
  if (error) throw error;
  console.log(JSON.stringify({ calls: manifest.calls, reserved: manifest.reserved, observed: manifest.observed, jobs: data }, null, 2));
} else throw new Error("Use prepare --ids=..., reassess --ids=..., run, or status. Never reset the pilot manifest.");
