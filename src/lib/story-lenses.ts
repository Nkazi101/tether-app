import { z } from "zod";
import {
  normaliseEvidenceText,
  normaliseEvidencePassage,
} from "./evidence-text";

// These are retrieval hypotheses, not a universal or validated Jungian taxonomy.
export const patternSchema = z.enum([
  "rescuer",
  "scapegoat",
  "uncontained-power",
  "old-and-new",
  "world-ending",
  "outsider-to-mainstream",
  "reckoning",
  "renewal",
  "other",
]);
export const lensEvidenceSchema = z.object({
  sourceId: z.string().min(1),
  passage: z.string().trim().min(18).max(300),
});
export const groundedReadingSchema = z.object({
  claim: z.string().trim().min(15).max(500),
  evidence: z.array(lensEvidenceSchema).min(1).max(3),
});
export const storyLensSchema = z.object({
  version: z.literal(1),
  pattern: patternSchema,
  title: z.string().trim().min(5).max(90),
  insight: z.string().trim().min(25).max(360),
  basis: z.enum(["actions", "framing", "actions-and-framing"]),
  scope: z.string().trim().min(15).max(300),
  present: groundedReadingSchema,
  historical: groundedReadingSchema.nullable(),
  roles: z
    .array(
      z.object({
        actor: z.string().trim().min(1).max(100),
        castBy: z.string().trim().min(1).max(160),
        role: z.string().trim().min(1).max(70),
        portrayal: groundedReadingSchema,
        power: groundedReadingSchema.nullable(),
      }),
    )
    .max(4),
  stage: z
    .object({
      label: z.enum([
        "beginning",
        "escalation",
        "crisis",
        "aftermath",
        "unclear",
      ]),
      reading: groundedReadingSchema,
    })
    .nullable(),
  signals: z
    .array(
      z.object({
        kind: z.enum([
          "projection",
          "omission",
          "symbol",
          "counterpressure",
          "grandiosity",
        ]),
        title: z.string().trim().min(5).max(90),
        observation: groundedReadingSchema,
        pairedObservation: groundedReadingSchema.nullable().default(null),
        reading: z.string().trim().min(15).max(420),
        alternative: z.string().trim().min(15).max(350),
        limitation: z.string().trim().min(15).max(350),
      }),
    )
    .max(3),
  alternative: groundedReadingSchema,
  boundary: groundedReadingSchema,
});
export type StoryLens = z.infer<typeof storyLensSchema>;
export type GroundedReading = z.infer<typeof groundedReadingSchema>;

export const narrativePlanSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        title: z.string().trim().min(5).max(90),
        observation: groundedReadingSchema,
        query: z.string().trim().min(15).max(200),
        disconfirmingQuestion: z.string().trim().min(15).max(300),
      }),
    )
    .max(2),
  materialQuery: z.string().trim().min(15).max(200),
  counterQuery: z.string().trim().min(15).max(200),
});
export type NarrativePlan = z.infer<typeof narrativePlanSchema>;

type SourceText = { id: string; title: string; summary: string; kind: string };
const normalise = normaliseEvidenceText;

export function validateNarrativePlan(
  value: unknown,
  present: SourceText[],
): NarrativePlan {
  const plan = narrativePlanSchema.parse(value);
  // Reuse the same passage checks without promoting a hypothesis to a finding.
  for (const hypothesis of plan.hypotheses) {
    const sources = new Map(
      present.filter((s) => s.kind !== "illustration").map((s) => [s.id, s]),
    );
    for (const support of hypothesis.observation.evidence) {
      const source = sources.get(support.sourceId);
      if (
        !source ||
        !normalise(`${source.title}. ${source.summary}`).includes(
          normaliseEvidencePassage(support.passage),
        ) ||
        support.passage.split(/\s+/).length > 25
      )
        throw new Error(
          "A search hypothesis needs a brief passage from the current evidence.",
        );
    }
  }
  return plan;
}

export function lensReadings(lens: StoryLens): GroundedReading[] {
  return [
    lens.present,
    ...(lens.historical ? [lens.historical] : []),
    ...lens.roles.flatMap((role) => [
      role.portrayal,
      ...(role.power ? [role.power] : []),
    ]),
    ...(lens.stage ? [lens.stage.reading] : []),
    ...lens.signals.map((signal) => signal.observation),
    ...lens.signals.flatMap((signal) =>
      signal.pairedObservation ? [signal.pairedObservation] : [],
    ),
    lens.alternative,
    lens.boundary,
  ];
}

/** Checks provenance, not semantic entailment or psychological validity. */
export function validateStoryLenses(
  value: unknown,
  present: SourceText[],
  selectedHistorical: SourceText[],
): StoryLens[] {
  const lenses = z.array(storyLensSchema).max(2).parse(value);
  const current = new Map(
    present.filter((s) => s.kind !== "illustration").map((s) => [s.id, s]),
  );
  const past = new Map(
    selectedHistorical
      .filter((s) => s.kind !== "illustration")
      .map((s) => [s.id, s]),
  );
  const all = new Map([...current, ...past]);
  const check = (
    reading: GroundedReading,
    allowed: Map<string, SourceText>,
  ) => {
    for (const support of reading.evidence) {
      const source = allowed.get(support.sourceId);
      if (
        !source ||
        !normalise(`${source.title}. ${source.summary}`).includes(
          normaliseEvidencePassage(support.passage),
        )
      )
        throw new Error("A lens passage was not found in its allowed source.");
      if (support.passage.split(/\s+/).length > 25)
        throw new Error("Lens quotations must remain brief.");
    }
  };
  for (const lens of lenses) {
    check(lens.present, current);
    check(lens.alternative, current);
    lens.roles.forEach((role) => {
      check(role.portrayal, current);
      if (role.power) check(role.power, current);
    });
    if (lens.stage) check(lens.stage.reading, current);
    lens.signals.forEach((signal) => {
      check(signal.observation, current);
      if (signal.pairedObservation) check(signal.pairedObservation, current);
      if (["projection", "grandiosity"].includes(signal.kind)) {
        if (
          !signal.pairedObservation ||
          signal.pairedObservation.evidence.every((paired) =>
            signal.observation.evidence.some(
              (first) =>
                first.sourceId === paired.sourceId &&
                normaliseEvidencePassage(first.passage) ===
                  normaliseEvidencePassage(paired.passage),
            ),
          )
        )
          throw new Error(
            "Projection and grandiosity need a separate, grounded observation of conduct or constraints.",
          );
      }
    });
    check(lens.boundary, all);
    if (lens.historical) {
      check(lens.historical, past);
      // A contrast needs evidence about each side, not just an old quotation.
      if (
        !lens.boundary.evidence.some((e) => current.has(e.sourceId)) ||
        !lens.boundary.evidence.some((e) => past.has(e.sourceId))
      )
        throw new Error(
          "A historical lens needs a difference grounded in both episodes.",
        );
    }
    if (
      !lens.historical &&
      lensReadings(lens).some((reading) =>
        reading.evidence.some((e) => !current.has(e.sourceId)),
      )
    )
      throw new Error(
        "An unmatched reading cannot borrow historical authority.",
      );
  }
  if (
    new Set(lenses.map((lens) => normalise(lens.title))).size !== lenses.length
  )
    throw new Error("Lens titles must distinguish different readings.");
  return lenses;
}
