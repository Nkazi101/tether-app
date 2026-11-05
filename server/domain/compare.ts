import { randomUUID } from "node:crypto";
import {
  ENGINE_VERSION,
  validateComparison,
  type Comparison,
  type EvidenceSource,
  type EventContext,
  type HistoricalCase,
  type Indicator,
  type Observation,
} from "../../src/lib/comparison";
import { extractContext } from "./context";

const labels: Record<string, string> = {
  "supply-dependence": "Dependence limits the available alternatives",
  "supply-disruption":
    "An interruption puts the supply relationship under pressure",
  "collective-bargaining":
    "Workers and an employer bargain over the terms of work",
  "work-stoppage": "Withholding work changes bargaining leverage",
  "gatekeeper-control": "Control of a channel shapes others’ choices",
  "enforcement-action":
    "Formal enforcement challenges the existing arrangement",
  "information-distribution": "A channel changes access to information",
  "military-confrontation": "Armed confrontation constrains available choices",
  "election-dispute": "An election produces an institutional dispute",
};
const required: Record<EventContext["family"], string[]> = {
  supply: ["supply-dependence", "supply-disruption"],
  labor: ["collective-bargaining", "work-stoppage"],
  regulation: ["gatekeeper-control", "enforcement-action"],
  information: ["information-distribution"],
  conflict: ["military-confrontation"],
  politics: ["election-dispute"],
  unknown: [],
};
const stop = new Set(
  "the a an in of and to is as at for on from with by this that what does how today historical current event".split(
    " ",
  ),
);
function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .match(/[a-z]{3,}/g)
      ?.filter((word) => !stop.has(word)) || [],
  );
}

export function rankCases(
  context: EventContext,
  sources: EvidenceSource[],
  cases: HistoricalCase[],
  question = "",
) {
  if (context.family === "unknown" || context.direction === "reversing")
    return [];
  const query = tokens(
    `${question} ${sources.map((source) => `${source.title} ${source.summary}`).join(" ")}`,
  );
  const keys = new Set(context.signals.map((signal) => signal.key));
  // Outcomes and archetypal identities are deliberately excluded from retrieval.
  const inputSourceIds = new Set(sources.map((source) => source.id));
  const candidates = cases
    .filter(
      (item) =>
        item.review !== "discovery" &&
        !item.sources.some((source) => inputSourceIds.has(source.id)),
    )
    .map((historicalCase) => {
      const shared = [
        ...new Set(historicalCase.signals.filter((key) => keys.has(key))),
      ];
      const terms = tokens(
        `${historicalCase.title} ${historicalCase.initialState}`,
      );
      const lexical =
        [...query].filter((token) => terms.has(token)).length /
        Math.max(1, Math.sqrt(query.size * terms.size));
      return {
        historicalCase,
        shared,
        lexical,
        structural:
          shared.length / Math.max(1, required[context.family].length),
      };
      // A broad tag alone cannot establish a useful historical correspondence.
    })
    .filter(
      (candidate) =>
        candidate.shared.length >= 2 &&
        candidate.historicalCase.sources.length > 0,
    );
  const lexicalRanks = [...candidates].sort((a, b) => b.lexical - a.lexical);
  const structuralRanks = [...candidates].sort(
    (a, b) => b.structural - a.structural,
  );
  return candidates
    .map((candidate) => ({
      ...candidate,
      score:
        1 / (20 + lexicalRanks.indexOf(candidate) + 1) +
        2 / (20 + structuralRanks.indexOf(candidate) + 1),
    }))
    .sort((a, b) => b.score - a.score || b.lexical - a.lexical);
}

export function buildIndicators(family: EventContext["family"]): Indicator[] {
  if (family === "supply")
    return [
      {
        id: "lost-supply",
        label: "The actual interruption",
        question: "Is the missing supply still unavailable?",
        strengthens:
          "A documented, persistent interruption keeps the bottleneck relevant.",
        weakens: "Verified restoration weakens the interruption mechanism.",
        sourceGuidance:
          "Operator reports, measured supply volumes and dated official releases; price alone is insufficient.",
        horizonDays: 30,
      },
      {
        id: "alternatives",
        label: "The ability to adapt",
        question: "Can buyers replace supply or reduce their need for it?",
        strengthens: "Limited substitutes keep dependence important.",
        weakens:
          "Replacement capacity or sustainable demand reduction reduces the constraint.",
        sourceGuidance:
          "Capacity and storage data, consumption reports and evidence distinguishing substitution from costly shutdowns.",
        horizonDays: 90,
      },
    ];
  if (family === "labor")
    return [
      {
        id: "work-leverage",
        label: "Bargaining leverage",
        question: "Does withholding work materially constrain production?",
        strengthens:
          "Sustained participation and limited replacement options preserve leverage.",
        weakens:
          "Replacement production or falling participation reduces leverage.",
        sourceGuidance:
          "Employer and union statements checked against production and participation reporting.",
        horizonDays: 30,
      },
      {
        id: "agreement",
        label: "A concrete agreement",
        question: "Are the parties reaching enforceable terms?",
        strengthens: "A documented impasse keeps the dispute active.",
        weakens: "A ratified settlement changes the situation.",
        sourceGuidance:
          "The agreement text, ratification results and statements from both parties.",
        horizonDays: 90,
      },
    ];
  if (family === "regulation")
    return [
      {
        id: "legal-stage",
        label: "The legal stage",
        question: "Is enforcement advancing, changing or being withdrawn?",
        strengthens: "A filed order or advancing case sustains the comparison.",
        weakens: "Dismissal, withdrawal or a changed legal basis weakens it.",
        sourceGuidance:
          "Dated court filings and regulator decisions, distinguishing allegations from findings.",
        horizonDays: 90,
      },
      {
        id: "remedy",
        label: "The remedy and alternatives",
        question: "Would the proposed remedy change control of the channel?",
        strengthens:
          "A specific, feasible remedy targets the source of control.",
        weakens:
          "A narrower remedy or changed market conditions limits transfer from this precedent.",
        sourceGuidance:
          "Remedy documents, implementation terms and independent market evidence.",
        horizonDays: 180,
      },
    ];
  return [];
}

export function buildComparison(input: {
  id?: string;
  situationId: string;
  snapshotId: string;
  title: string;
  question: string;
  sources: EvidenceSource[];
  cases: HistoricalCase[];
  context?: EventContext;
  mode: Comparison["inputMode"];
  now?: string;
}): Comparison {
  const now = input.now || new Date().toISOString();
  const context = input.context || extractContext(input.sources);
  const ranked = rankCases(context, input.sources, input.cases, input.question);
  const best = ranked[0];
  const primary = best?.historicalCase || null;
  const missing = required[context.family].filter(
    (key) => !context.signals.some((signal) => signal.key === key),
  );
  const fullyMapped = Boolean(
    primary &&
      required[context.family].length >= 2 &&
      missing.length === 0 &&
      required[context.family].every((key) =>
        best.shared.includes(key as never),
      ),
  );
  const reportingPublishers = new Set(
    input.sources
      .filter((source) => source.url && source.kind === "reporting")
      .map((source) => source.publisher),
  );
  const supported =
    fullyMapped &&
    primary?.review === "source-checked" &&
    reportingPublishers.size >= 2;
  const state: Comparison["state"] = !primary
    ? context.family === "unknown" && input.title.length < 45
      ? "needs-clarification"
      : "insufficient-evidence"
    : supported
      ? "supported"
      : "partial";
  const correspondences = primary
    ? context.signals
        .filter((signal) => primary.signals.includes(signal.key))
        .map((signal) => ({
          relationship: labels[signal.key],
          presentEvidence: signal.evidence,
          historicalEvidence: primary.initialState,
          presentSourceId: signal.sourceId,
          historicalSourceIds: primary.sources.map((source) => source.id),
        }))
    : [];
  const unknowns: string[] = [];
  if (input.sources.some((source) => source.kind === "user-description"))
    unknowns.push(
      "The submitted description has not been independently corroborated. It is the starting point for this comparison.",
    );
  if (input.mode === "walkthrough")
    unknowns.push(
      "This is a dated historical walkthrough, not live news or a forecast made before the outcome was known.",
    );
  if (reportingPublishers.size < 2 && input.mode !== "walkthrough")
    unknowns.push(
      "The current evidence does not contain corroborating reporting from two distinct publishers.",
    );
  if (primary?.review === "reference-only") unknowns.push(primary.reviewNote);
  if (missing.length)
    unknowns.push(
      "Some relationships needed for a strong comparison are not established in the submitted evidence.",
    );
  if (!context.actors.length)
    unknowns.push(
      "Attributed roles describe a particular reading, not permanent psychological identities or established hidden motives.",
    );
  if (context.direction === "reversing")
    unknowns.push(
      "The action reverses an earlier policy, disruption or confrontation. A precedent about continuing escalation would be misleading without more context.",
    );
  const indicators = primary ? buildIndicators(context.family) : [];
  return validateComparison({
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    id: input.id || randomUUID(),
    situationId: input.situationId,
    snapshotId: input.snapshotId,
    previousId: null,
    createdAt: now,
    evidenceCutoff: now,
    title: input.title,
    inputMode: input.mode,
    state,
    summary: primary
      ? `A useful precedent is ${primary.title} (${primary.period}). ${correspondences[0]?.relationship || "The underlying relationship offers a partial comparison"}. ${primary.boundaries[0]}`
      : context.direction === "reversing"
        ? "This event describes a reversal. The available archive does not yet support a sufficiently specific precedent for that change."
        : input.mode === "reporting"
          ? "The initial archive search has not established a defensible historical connection yet. A wider investigation is needed; this is not evidence that no parallel exists."
          : "The available evidence does not yet establish a convincing historical comparison. A wider historical search or a more specific account of the event may help; this is not evidence that no parallel exists.",
    question: input.question,
    context,
    sources: input.sources,
    primary,
    alternatives: ranked.slice(1, 4).map((candidate) => ({
      historicalCase: candidate.historicalCase,
      reason: `${candidate.shared.map((key) => labels[key]).join("; ")}. ${candidate.historicalCase.boundaries[0]}`,
    })),
    correspondences,
    differences: primary ? primary.boundaries : [],
    unknowns,
    indicators,
    scenarios: indicators.length
      ? [
          {
            id: "persists",
            title: "The pressure persists",
            condition: indicators[0].strengthens,
            implication:
              "The shared mechanism remains worth following. The historical ending is still not guaranteed.",
            indicatorIds: [indicators[0].id],
          },
          {
            id: "adapts",
            title: "The situation takes a different path",
            condition: indicators[1]?.weakens || indicators[0].weakens,
            implication:
              "The original comparison may weaken or need a different precedent. Check the costs and who experiences them.",
            indicatorIds: indicators.map((indicator) => indicator.id),
          },
        ]
      : [],
    narrative:
      primary?.narrative && correspondences.length >= 2
        ? {
            title: primary.narrative.title,
            interpretation: `In the historical case: ${primary.narrative.interpretation} ${context.family === "supply" ? "In the present event, the cited evidence establishes dependence under pressure. If a search for substitutes or coordinated action emerges, this same story may help interpret it. That response has to be observed, not assumed." : "The present-day correspondences above provide a starting point for this lens. Any further response or motive must be observed rather than inferred from the historical ending."}`,
            alternative: primary.narrative.alternative,
            evidenceSourceIds: [
              ...new Set([
                ...primary.narrative.sourceIds,
                ...context.signals.map((signal) => signal.sourceId),
              ]),
            ],
            status: "interpretation",
          }
        : null,
    scope: {
      reviewedCases: input.cases.filter(
        (item) => item.review === "source-checked",
      ).length,
      referenceCases: input.cases.filter(
        (item) => item.review === "reference-only",
      ).length,
      considered: input.cases.length,
      note: "This is the best-supported lead in the available archive for the relationships shown, not a claim to have searched all of history. Outcomes and persona labels do not increase the match ranking.",
    },
    change: null,
  });
}

export function reviseComparison(
  previous: Comparison,
  observation: Observation,
  snapshotId: string,
): Comparison {
  const indicator = previous.indicators.find(
    (item) => item.id === observation.indicatorId,
  );
  if (!indicator)
    throw new Error(
      "This observation does not refer to an indicator in the comparison.",
    );
  const challenges =
    observation.direction === "weakens" ||
    observation.direction === "retracted";
  const sourceId = `observation:${observation.id}`;
  const change =
    observation.direction === "retracted"
      ? "A previously reported observation was retracted."
      : challenges
        ? `New evidence challenges “${indicator.label}”.`
        : observation.direction === "strengthens"
          ? `New evidence is consistent with “${indicator.label}”.`
          : `An observation about “${indicator.label}” remains inconclusive.`;
  return validateComparison({
    ...previous,
    id: randomUUID(),
    snapshotId,
    previousId: previous.id,
    createdAt: observation.createdAt,
    evidenceCutoff: observation.createdAt,
    state:
      challenges && previous.state === "supported" ? "partial" : previous.state,
    // A contested reading needs reassessment. Its earlier version remains
    // available; a reader observation is not a model re-analysis of the lens.
    lenses: challenges ? [] : previous.lenses,
    pairedStory: challenges ? null : previous.pairedStory,
    sources: [
      ...previous.sources,
      {
        id: sourceId,
        title: `Observation: ${indicator.label}`,
        url: observation.sourceUrl || null,
        publisher:
          observation.authorKind === "reader"
            ? "Reader-reported observation"
            : "Reporting observation",
        summary: observation.text,
        publishedAt: observation.observedAt,
        retrievedAt: observation.createdAt,
        kind:
          observation.authorKind === "reader"
            ? "user-description"
            : "reporting",
      },
    ],
    summary: challenges
      ? `${change} ${indicator.weakens} The original historical comparison is retained below so you can inspect what changed.`
      : previous.summary,
    unknowns: [
      ...previous.unknowns,
      ...(challenges
        ? [
            `The assumption behind “${indicator.label}” is contested. Its implication requires reassessment against the new source.`,
            ...(previous.lenses.length
              ? [
                  "The earlier narrative reading has been suspended pending reassessment. It remains available in the previous version.",
                ]
              : []),
          ]
        : []),
      ...(observation.authorKind === "reader"
        ? [
            "The new observation is a reader’s assessment; supplying a link does not independently verify it.",
          ]
        : []),
    ],
    change: {
      summary: change,
      reasons: [
        observation.text,
        challenges
          ? indicator.weakens
          : observation.direction === "strengthens"
            ? indicator.strengthens
            : "No directional conclusion is supported yet.",
        "An observation records evidence about a condition; it does not by itself prove causation.",
      ],
      observationIds: [observation.id],
    },
  });
}
