import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ENGINE_VERSION,
  analysisRequestSchema,
  sourceSchema,
  observationSchema,
  researchSchema,
  validateComparison,
  type EvidenceSource,
  type Observation,
} from "../../src/lib/comparison";
import { buildComparison, reviseComparison } from "../domain/compare";
import { extractContext } from "../domain/context";
import { fetchArticle, InputError } from "./article";
import { CANON_EDITION } from "../domain/canon";
import { ResearchDeferred } from "../domain/research-deferred";
import { recordResearchGap } from "./canon-maintenance";
import { historicalPacketKey, researchHistory, RESEARCH_VERSION } from "./episode-research";
import {researchNarrative,NARRATIVE_RESEARCH_VERSION,frameFingerprint} from './narrative-research';
import { Store, hash, type DurableJob } from "./store";
import { reportingEvidence, reportingSourceKey } from "../domain/reporting";
import {currentFrameSchema,validateFrame} from "../../src/lib/narrative-comparison";
import { episodeSchema, validateEpisode } from "../../src/lib/episodes";

export async function processComparisonJob(
  store: Store,
  job: DurableJob,
  dependencies: {
    fetchArticle?: typeof fetchArticle;
    researchHistory?: typeof researchHistory;
  } = {},
) {
  const readArticle = dependencies.fetchArticle || fetchArticle;
  const searchHistory = dependencies.researchHistory || researchNarrative;
  if (job.kind === "observation") {
    const payload = z
      .object({
        situationId: z.string().uuid(),
        observation: observationSchema,
        forkFromAnalysisId: z.string().uuid().optional(),
      })
      .parse(job.payload);
    const situation = await store.situation(payload.situationId);
    if (
      !situation ||
      !job.owner_user_id ||
      !situation.latest_analysis_id ||
      (situation.owner_key !== job.owner_key &&
        !(situation.is_public && payload.forkFromAnalysisId))
    )
      throw new InputError("This private situation is unavailable.", 404);
    const previous = await store.analysis(
      payload.forkFromAnalysisId || situation.latest_analysis_id,
    );
    if (!previous || previous.situationId !== situation.id)
      throw new Error("The previous comparison could not be read.");
    const observation: Observation = {
      ...payload.observation,
      id: job.id,
      createdAt: new Date().toISOString(),
      authorKind: "reader",
    };
    const revised = reviseComparison(previous, observation, randomUUID());
    if (payload.forkFromAnalysisId) {
      revised.situationId = randomUUID();
      revised.previousId = null;
      revised.forkOriginId = previous.id;
    }
    await store.publish(
      job,
      revised,
      payload.forkFromAnalysisId
        ? `${job.owner_key}:fork:${job.id}`
        : situation.identity_key,
      false,
      observation,
    );
    return revised;
  }
  const trusted = job.owner_key.startsWith("system:");
  if (job.payload.refreshHeadline === true && !trusted)
    throw new InputError("A reporting headline refresh is unavailable.", 403);
  let shouldResearch = job.kind === "research" || !trusted;
  const researchFrom =
    typeof job.payload.researchFrom === "string"
      ? await store.analysis(job.payload.researchFrom)
      : null;
  if (researchFrom) {
    const origin = await store.situation(researchFrom.situationId);
    if (!origin || (!origin.is_public && origin.owner_key !== job.owner_key))
      throw new InputError("This private comparison is unavailable.", 404);
  }
  const request = analysisRequestSchema.parse({
    input: job.payload.input,
    question: job.payload.question,
    ...(job.payload.situationId
      ? { situationId: job.payload.situationId }
      : {}),
  });
  let mode: "text" | "article" | "reporting" | "walkthrough" = "text";
  let sources: EvidenceSource[];
  if (researchFrom) {
    sources = researchFrom.sources;
    mode = researchFrom.inputMode;
  } else if (trusted && job.payload.sources) {
    sources = z.array(sourceSchema).min(1).max(8).parse(job.payload.sources);
    mode = job.payload.walkthrough ? "walkthrough" : "reporting";
  } else if (/^https?:\/\//i.test(request.input)) {
    sources = [await readArticle(request.input)];
    mode = "article";
  } else {
    sources = [
      {
        id: `description:${hash(request.input).slice(0, 24)}`,
        title:
          request.input.split(/[\n.!?]/)[0].slice(0, 200) ||
          request.input.slice(0, 200),
        summary: request.input,
        url: null,
        publisher: "Your description",
        publishedAt: null,
        retrievedAt: new Date().toISOString(),
        kind: "user-description",
      },
    ];
  }
  const identityKey = request.situationId
    ? ""
    : researchFrom
      ? `${job.owner_key}:research:${researchFrom.situationId}`
      : `${job.owner_key}:${hash(sources[0].url || request.input.toLowerCase().replace(/\s+/g, " "))}`;
  let existing = request.situationId
    ? await store.situation(request.situationId)
    : await store.byIdentity(identityKey);
  if (!existing && trusted && job.owner_key === "system:reporting")
    existing = await store.findReportingSituation(sources[0]);
  if (existing && existing.owner_key !== job.owner_key)
    throw new InputError("This private situation is unavailable.", 404);
  const previous = existing?.latest_analysis_id
    ? await store.analysis(existing.latest_analysis_id)
    : null;
  const deliberateResearch = job.payload.forceReassessment === true ||
    job.payload.refreshSources === true || job.payload.refreshHeadline === true ||
    ["gapCluster", "canonExpansionWeek", "canonCheck"].some(key => job.payload[key] != null);
  // Older feed jobs can lack both situationId and researchFrom. If a completed
  // current-method head already covers their source, finish the redundant job
  // before fetching the article/archive or spending another model allowance.
  // Multiple accounts remain on the ordinary path so no new evidence is lost.
  if (
    job.owner_key === "system:reporting" && job.owner_user_id === null &&
    job.kind === "research" && mode === "reporting" && !deliberateResearch &&
    existing?.is_public && previous?.inputMode === "reporting" &&
    previous.research?.version === NARRATIVE_RESEARCH_VERSION &&
    Date.parse(job.created_at) < Date.parse(previous.createdAt) &&
    !(typeof job.payload.depth === "number" && job.payload.depth > previous.research.depth) &&
    sources.length === 1 && sources[0].kind === "reporting" && sources[0].url
  ) {
    const incoming = sources[0];
    const retained = previous.sources.find(source => source.kind === "reporting" &&
      source.url && reportingSourceKey(source) === reportingSourceKey(incoming));
    if (retained) {
      const identical = hash(reportingEvidence([incoming])) === hash(reportingEvidence([retained]));
      const capturedAt = Date.parse(retained.retrievedAt);
      const knownAfter = [job.created_at, incoming.retrievedAt, incoming.publishedAt]
        .filter((value): value is string => Boolean(value)).map(value => Date.parse(value));
      const coveredByArticle = retained.retrieval === "article-text" && Number.isFinite(capturedAt) &&
        knownAfter.every(time => Number.isFinite(time) && time <= capturedAt);
      if (identical || coveredByArticle) {
        if (!await store.rpc<boolean>("tether_reuse_job", {
          p_id: job.id, p_lease: job.lease_token, p_result: previous.id,
        })) throw Object.assign(new Error("The request lease expired before reuse."), { code: "40001" });
        return previous;
      }
    }
  }
  // A feed excerpt must not replace a fully read investigation merely because
  // its feed headline or boilerplate question changed. Re-read the article and
  // compare actual evidence before deciding whether another assessment is due.
  if (
    trusted && job.kind === "analysis" && mode === "reporting" &&
    job.payload.refreshHeadline !== true &&
    previous?.sources[0]?.retrieval === "article-text" &&
    sources[0].retrieval === "feed-excerpt"
  ) shouldResearch = true;
  const sourceKey = (source: EvidenceSource) =>
    mode === "reporting" ? reportingSourceKey(source) : source.url || source.id;
  if (previous && (trusted || request.situationId)) {
    const incomingUrls = new Set(
      sources.map(sourceKey),
    );
    sources = [
      ...sources,
      ...previous.sources.filter(
        (source) => !incomingUrls.has(sourceKey(source)),
      ),
    ].slice(0, 8);
  }
  if (
    shouldResearch &&
    mode === "reporting" &&
    sources[0].url &&
    (sources[0].retrieval !== "article-text" ||
      (trusted && job.payload.refreshSources === true))
  ) {
    try {
      const article = await readArticle(sources[0].url);
      sources = [
        {
          ...article,
          publishedAt: article.publishedAt || sources[0].publishedAt,
          publisher: sources[0].publisher,
          topic: sources[0].topic,
          image: article.image || sources[0].image,
        },
        ...sources.slice(1),
      ];
    } catch {
      /* The feed excerpt remains attributed; no full-text claim is made. */
    }
  }
  sources = sources.filter(
    (source, index, all) =>
      all.findIndex(
        (other) => sourceKey(other) === sourceKey(source),
      ) === index,
  );
  const material = (items: EvidenceSource[]) =>
    items.map((input) => {
      const { retrievedAt: _captured, ...item } = sourceSchema.parse(input);
      return item;
    });
  if (trusted && job.payload.refreshHeadline === true) {
    if (
      job.kind !== "analysis" ||
      !previous ||
      !existing ||
      !existing.is_public ||
      previous.inputMode !== "reporting" ||
      sources[0].retrieval !== "article-text" ||
      hash(material(previous.sources)) !== hash(material(sources))
    )
      throw new InputError(
        "The reporting changed; a headline-only correction cannot replace its analysis.",
        409,
      );
    if (previous.title === sources[0].title) {
      const reused = await store.rpc<boolean>("tether_reuse_job", {
        p_id: job.id,
        p_lease: job.lease_token,
        p_result: previous.id,
      });
      if (!reused) throw new Error("The headline correction lease expired.");
      return previous;
    }
    const corrected = validateComparison({
      ...previous,
      id: randomUUID(),
      snapshotId: randomUUID(),
      previousId: previous.id,
      createdAt: new Date().toISOString(),
      title: sources[0].title,
      change: {
        summary: "Headline aligned with the retrieved article.",
        reasons: [
          "The headline now uses the title of the reporting source already captured in this analysis.",
          "This is a headline correction; the reading retains its original evidence cutoff.",
        ],
        observationIds: [],
      },
    });
    await store.publish(job, corrected, existing.identity_key, true);
    return corrected;
  }
  const cases = await store.cases();
  const archiveVersion = hash({ reviewed: cases.filter(item => item.review !== "web-researched" || item.narrativeRecord).map(item=>({id:item.id,version:item.version})), canon: CANON_EDITION });
  const depth =
    typeof job.payload.depth === "number"
      ? Math.min(3, Math.max(1, job.payload.depth))
      : 1;
  // Ingestion refreshes evidence, not the research method. A deliberate backfill
  // or reader request can reassess unchanged reporting without making a routine
  // feed poll demote a previously published comparison or repeat paid extraction.
  const routineReporting = trusted && mode === "reporting" && job.kind === "analysis";
  const obsoleteResearchJob=Boolean(trusted&&job.kind==='research'&&!deliberateResearch&&previous?.research?.version===NARRATIVE_RESEARCH_VERSION&&researchFrom&&researchFrom.id!==previous.id&&Date.parse(job.created_at)<Date.parse(previous.createdAt)&&job.payload.method!==NARRATIVE_RESEARCH_VERSION);
  if (obsoleteResearchJob&&previous){
    if(!await store.rpc<boolean>('tether_reuse_job',{p_id:job.id,p_lease:job.lease_token,p_result:previous.id}))throw Object.assign(new Error('The request lease expired before reuse.'),{code:'40001'});
    return previous;
  }
  if (
    previous &&
    !(trusted && job.payload.forceReassessment === true) &&
    previous.engineVersion === ENGINE_VERSION &&
    (previous.archiveVersion === archiveVersion || routineReporting) &&
    ((trusted && mode === "reporting") || previous.question === request.question) &&
    (trusted && mode === "reporting"
      ? hash(reportingEvidence(previous.sources)) === hash(reportingEvidence(sources))
      : hash(material(previous.sources)) === hash(material(sources))) &&
    (!shouldResearch || routineReporting ||
      (previous.research &&
        (previous.research.status === "searched" ||
          (trusted && mode === "reporting" && (previous.lenses.length > 0 || previous.currentEpisode?.encoding === "typed-relations-2" || previous.research.eventApplicability === "ineligible"))) &&
        previous.research.version === NARRATIVE_RESEARCH_VERSION &&
        (previous.research.publicationStandard === "original-sources-1" || previous.research.eventApplicability === "ineligible") &&
        previous.research.depth >= depth &&
        Date.parse(previous.research.searchedAt) > Date.now() - 86400000))
  ) {
    const reused = await store.rpc<boolean>("tether_reuse_job", {
      p_id: job.id,
      p_lease: job.lease_token,
      p_result: previous.id,
    });
    if (!reused)
      throw Object.assign(
        new Error("The request lease expired before reuse."),
        { code: "40001" },
      );
    return previous;
  }
  const rules = extractContext(sources);
  // Background reporting stays bounded and uses explicit relationships. User
  // requests can use one budgeted model extraction with exact evidence spans.
  const context = rules;
  let comparison = buildComparison({
    situationId: existing?.id || randomUUID(),
    snapshotId: randomUUID(),
    title:
      mode === "reporting" && sources[0].retrieval === "article-text"
        ? sources[0].title
        : trusted || researchFrom
          ? request.input
          : sources[0].title,
    question: request.question,
    sources,
    cases,
    context,
    mode,
  });
  comparison.topic = sources[0].topic || researchFrom?.topic || "general";
  if (
    researchFrom &&
    !existing &&
    hash(material(sources)) === hash(material(researchFrom.sources))
  ) {
    comparison = {
      ...researchFrom,
      ...comparison,
      primary: researchFrom.primary,
      correspondences: researchFrom.correspondences,
      differences: researchFrom.differences,
      indicators: researchFrom.indicators,
      narrative: researchFrom.narrative,
      lenses: researchFrom.lenses,
      state: researchFrom.state,
      research: researchFrom.research,
      forkOriginId: researchFrom.id,
    };
  }
  if (shouldResearch) {
    comparison.research = researchFrom?.research || previous?.research || null;
    const retainedCurrent = researchFrom || previous;
    if(retainedCurrent?.currentFrame?.evidenceFingerprint===frameFingerprint(sources))comparison.currentFrame=retainedCurrent.currentFrame;
    if (retainedCurrent?.currentEpisode && retainedCurrent.research?.currentReview === "model-checked" && hash(retainedCurrent.currentEpisode) === retainedCurrent.research.frozenEpisodeHash && hash(material(retainedCurrent.sources)) === hash(material(sources))) {
      comparison.currentEpisode = retainedCurrent.currentEpisode;
      comparison.research = { ...retainedCurrent.research, currentEvidenceFingerprint: historicalPacketKey(retainedCurrent.sources) };
    }
    const narrativeCheckpoint=z.object({currentFrame:currentFrameSchema,research:researchSchema}).safeParse(job.payload.currentCheckpoint);
    if(narrativeCheckpoint.success&&narrativeCheckpoint.data.research.version===NARRATIVE_RESEARCH_VERSION&&narrativeCheckpoint.data.currentFrame.evidenceFingerprint===frameFingerprint(sources))comparison.currentFrame=validateFrame(narrativeCheckpoint.data.currentFrame,sources);
    const checkpoint = z.object({ currentEpisode: episodeSchema, research: researchSchema }).safeParse(job.payload.currentCheckpoint);
    if (checkpoint.success && checkpoint.data.research.currentReview === "model-checked" &&
        checkpoint.data.research.currentEvidenceFingerprint === historicalPacketKey(sources) &&
        checkpoint.data.research.frozenEpisodeHash === hash(checkpoint.data.currentEpisode)) {
      comparison.currentEpisode = validateEpisode(checkpoint.data.currentEpisode, sources);
      comparison.research = checkpoint.data.research;
    }
    comparison.forkOriginId =
      researchFrom && researchFrom.situationId !== comparison.situationId
        ? researchFrom.id
        : previous?.forkOriginId || null;
  }
  if (shouldResearch)
    comparison = await searchHistory(
      store,
      comparison,
      trusted,
      depth,
      cases,
    );
  if (["capacity","network"].includes(comparison.research?.diagnostic?.code||"")) throw new ResearchDeferred(
    comparison.currentFrame?{currentFrame:comparison.currentFrame,research:comparison.research}:
    comparison.currentEpisode && comparison.research?.currentReview === "model-checked"
      ? {currentEpisode:comparison.currentEpisode,research:comparison.research}:null,
    comparison.research?.diagnostic?.code==='network'?'provider':'allowance',
  );
  comparison.archiveVersion = archiveVersion;
  comparison.previousId = previous?.id || null;
  if (previous) {
    const researchReassessment =
      comparison.research &&
      (previous.research?.version !== comparison.research.version ||
        (trusted && job.payload.forceReassessment === true));
    const noLongerEstablished = previous.context.signals.filter(
      (signal) =>
        !comparison.context.signals.some(
          (current) => current.key === signal.key,
        ),
    );
    comparison.change = {
      summary: researchReassessment
        ? "Reassessed with source typing, narrative comparison and claim review."
        : previous.primary?.id !== comparison.primary?.id
          ? "The historical correspondence needs a fresh assessment."
          : noLongerEstablished.length
            ? "Some earlier relationships are no longer established in the latest evidence."
            : "New reporting refreshed this comparison.",
      reasons: [
        ...(researchReassessment
          ? [
              "This is a research reassessment; it does not by itself establish a new development in the event.",
            ]
          : []),
        sources[0].summary.slice(0, 500),
        ...noLongerEstablished.map(
          (signal) =>
            `The latest evidence does not establish “${signal.key.replaceAll("-", " ")}” in the same way. Absence from a report is not proof that the condition ended.`,
        ),
        "Earlier versions remain available in the history.",
      ],
      observationIds: [],
    };
  }
  await store.publish(
    job,
    comparison,
    existing?.identity_key || identityKey,
    trusted,
  );
  if (trusted && mode === "reporting") {
    try { await recordResearchGap(store,comparison); }
    catch { console.warn(JSON.stringify({event:"coverage-gap-record-unavailable"})); }
  }
  return comparison;
}
