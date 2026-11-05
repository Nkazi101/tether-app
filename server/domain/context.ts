import {
  contextSchema,
  type EventContext,
  type EvidenceSource,
  type Signal,
} from "../../src/lib/comparison";

const negated: Partial<Record<Signal["key"], RegExp>> = {
  "supply-dependence":
    /\b(?:no longer|not|without)\b.{0,25}\b(?:depend|import)\w*/i,
  "supply-disruption":
    /\b(?:no|not|without|avoided?|averted?)\b.{0,35}\b(?:shortages?|disruption|supply cuts?|embargo)\b/i,
  "work-stoppage":
    /\b(?:not|no|against|averted?|avoid\w*|cancel\w*)\b.{0,35}\b(?:strike|walkout|work stoppage)\b/i,
  "enforcement-action":
    /\b(?:not|no|den(?:y|ies|ied)|abandon\w*|drop\w*)\b.{0,55}\b(?:lawsuit|case|sue|antitrust|enforcement)\b/i,
};

// Rules only extract explicit, local relationships. No inferred personas enter
// retrieval, and a missing relation stays missing. The model uses the same contract.
export function extractContext(sources: EvidenceSource[]): EventContext {
  const signals: Signal[] = [];
  const add = (
    key: Signal["key"],
    source: EvidenceSource,
    expression: RegExp,
    required?: RegExp,
  ) => {
    if (signals.some((signal) => signal.key === key)) return;
    const text = `${source.title}. ${source.summary}`;
    const match = expression.exec(text);
    if (!match) return;
    const start = Math.max(0, match.index - 110);
    const evidence = text.slice(
      start,
      Math.min(text.length, match.index + match[0].length + 180),
    );
    if (required && !required.test(evidence)) return;
    if (negated[key]?.test(evidence)) return;
    signals.push({
      key,
      evidence: evidence.slice(0, 400),
      sourceId: source.id,
    });
  };
  for (const source of sources) {
    add(
      "supply-disruption",
      source,
      /\b(shortages?|supply (?:cuts?|disruption|shock)|(?:cuts?|disrupt\w*|halt\w*|block\w*).{0,55}(?:suppl\w*|pipeline|shipping)|embargo|gas prices.{0,40}(?:surge|soar)|supply fears)\b/i,
      /gas|oil|energy|supply|shipping|pipeline|imports?|commodity/i,
    );
    add(
      "supply-dependence",
      source,
      /\b(import\w*|depend\w*|replacement suppl\w*|pipeline|winter supply|alternative suppl\w*)\b/i,
      /gas|oil|energy|supply|shipping|pipeline|imports?|commodity/i,
    );
    add(
      "collective-bargaining",
      source,
      /\b(bargain\w*|union recognition|labor dispute|labour dispute|pay negotiations|workers.{0,45}(?:wages?|pay|conditions|union))\b/i,
    );
    add(
      "work-stoppage",
      source,
      /\b((?:workers?|employees?|unions?|autoworkers).{0,80}(?:strike|walkout|stop\w* work|occup\w*)|(?:strike|walkout|lockout).{0,65}(?:workers?|union|wages?|factory|plant))\b/i,
    );
    add(
      "gatekeeper-control",
      source,
      /\b(monopoly|dominant (?:platform|firm|company)|market power|controls? access|gatekeeper|bundl\w*)\b/i,
    );
    add(
      "enforcement-action",
      source,
      /\b(?:regulators?|court|government|justice department).{0,80}(?:sues?|lawsuit|files?|orders?|antitrust|break.?up|remed\w*)|\bantitrust (?:case|lawsuit|enforcement)\b/i,
    );
    add(
      "information-distribution",
      source,
      /\b(?:printing press|publishing|distribution|creators?|information).{0,70}(?:access|cost|control|channel|publish|distribution)\b/i,
    );
    add(
      "military-confrontation",
      source,
      /\b(military|troops|armed forces|missiles|invasion|armed conflict|border crisis)\b/i,
    );
    add(
      "election-dispute",
      source,
      /\b(?:election|electoral|ballot).{0,70}(?:defeat|dispute|fraud|loss|results|passport)|\bdefeated.{0,40}candidate\b/i,
    );
  }
  const combined = sources
    .map((source) => `${source.title}. ${source.summary}`)
    .join("\n");
  const reversing =
    /\b(?:abandons?|drops?|dismiss(?:es|ed)?|repeals?|ends?|lifts?|withdraws?|averts?|cancels?|calls? off)\b.{0,70}\b(?:antitrust|case|lawsuit|embargo|ban|strike|restrictions?)\b|\b(?:supply|supplies|pipeline deliveries)\b.{0,30}\b(?:restored|resumed|reopened)\b/i.test(
      combined,
    );
  const keys = new Set(signals.map((signal) => signal.key));
  const family: EventContext["family"] =
    keys.has("supply-disruption") || keys.has("supply-dependence")
      ? "supply"
      : keys.has("work-stoppage") || keys.has("collective-bargaining")
        ? "labor"
        : keys.has("gatekeeper-control") || keys.has("enforcement-action")
          ? "regulation"
          : keys.has("military-confrontation")
            ? "conflict"
            : keys.has("election-dispute")
              ? "politics"
              : keys.has("information-distribution")
                ? "information"
                : "unknown";
  return contextSchema.parse({
    family,
    direction: reversing
      ? "reversing"
      : signals.length
        ? "developing"
        : "unclear",
    signals,
    actors: [],
    summary: sources[0]?.summary.slice(0, 1500) || "",
    method: "evidence-rules",
  });
}

export function validateExtractedContext(
  value: unknown,
  sources: EvidenceSource[],
): EventContext {
  const parsed = contextSchema.parse(value);
  const byId = new Map(
    sources.map((source) => [
      source.id,
      `${source.title}. ${source.summary}`.replace(/\s+/g, " ").toLowerCase(),
    ]),
  );
  for (const item of [...parsed.signals, ...parsed.actors]) {
    const source = byId.get(item.sourceId);
    const passage = item.evidence.replace(/\s+/g, " ").toLowerCase();
    if (!source || !source.includes(passage))
      throw new Error(
        "Extraction must cite a passage actually present in its source.",
      );
    if ("key" in item) {
      const index = source.indexOf(passage);
      if (
        negated[item.key]?.test(
          source.slice(Math.max(0, index - 60), index + passage.length + 60),
        )
      )
        throw new Error(
          "Extraction cannot turn a negated relationship into an observed action.",
        );
    }
  }
  // Direction reversals are never silently erased by enrichment.
  if (extractContext(sources).direction === "reversing")
    parsed.direction = "reversing";
  return parsed;
}
