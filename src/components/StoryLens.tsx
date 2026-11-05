import React from "react";
import {NarrativeText} from "./NarrativeText";
import { ArrowUpRight, Plus } from "lucide-react";
import type { EvidenceSource } from "../lib/comparison";
import type { GroundedReading, StoryLens } from "../lib/story-lenses";

const stageNames = {
  beginning: "Beginning",
  escalation: "Escalation",
  crisis: "Crisis",
  aftermath: "Aftermath",
  unclear: "Stage unclear",
};
const signalNames = {
  projection: "Projection to examine",
  omission: "The missing question",
  symbol: "The image doing the work",
  counterpressure: "Pressure in the other direction",
  grandiosity: "The language of inevitability",
};
const basisNames = {
  actions: "Enacted actions",
  framing: "Public framing",
  "actions-and-framing": "Actions and public framing",
};

function Evidence({
  reading,
  sources,
}: {
  reading: GroundedReading;
  sources: EvidenceSource[];
}) {
  return (
    <div className="lens-passages">
      {reading.evidence.map((support, i) => {
        const source = sources.find((s) => s.id === support.sourceId);
        return (
          <figure key={`${support.sourceId}-${i}`}>
            <blockquote>“{support.passage}”</blockquote>
            <figcaption>
              {source?.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.publisher} · {source.title}
                  <ArrowUpRight size={13} />
                </a>
              ) : (
                <span>
                  {source?.publisher || "Source"} · {source?.title}
                </span>
              )}
            </figcaption>
            {source?.kind === "user-description" && (
              <p className="living-subtle">
                Reader-supplied account · not independently verified.
              </p>
            )}
          </figure>
        );
      })}
    </div>
  );
}

function Reading({
  reading,
  sources,
  label,
}: {
  reading: GroundedReading;
  sources: EvidenceSource[];
  label: string;
}) {
  return (
    <>
      <p><NarrativeText text={reading.claim}/></p>
      <details className="lens-evidence">
        <summary aria-label={`Check evidence: ${label}`}>
          Check the evidence <Plus size={14} />
        </summary>
        <Evidence reading={reading} sources={sources} />
      </details>
    </>
  );
}

export function LensReading({
  lens,
  sources,
  historicalTitle,
}: {
  lens: StoryLens;
  sources: EvidenceSource[];
  historicalTitle?: string;
}) {
  return (
    <section className="lens-reading" aria-label={`Reading: ${lens.title}`}>
      <div className="lens-context">
        <span className="lens-label">A reading to test</span>
        <p>
          <strong>{basisNames[lens.basis]}.</strong> <NarrativeText text={lens.scope}/>
        </p>
      </div>
      <div className="lens-grounding">
        <section>
          <p className="discovery-eyebrow">WHAT SUPPORTS IT NOW</p>
          <Reading
            reading={lens.present}
            sources={sources}
            label="the current story"
          />
        </section>
        {lens.historical && (
          <section>
            <p className="discovery-eyebrow">THE EARLIER EXPRESSION</p>
            <h3>{historicalTitle}</h3>
            <Reading
              reading={lens.historical}
              sources={sources}
              label="the historical story"
            />
          </section>
        )}
      </div>
      {lens.roles.length > 0 && (
        <section className="lens-roles">
          <div className="lens-section-title">
            <p className="discovery-eyebrow">WHO’S PLAYING WHAT</p>
            <h2>The role and the reality.</h2>
          </div>
          {lens.roles.map((role, i) => (
            <article key={`${role.actor}-${i}`}>
              <div className="lens-actor">
                <span><NarrativeText text={role.role}/></span>
                <h3>{role.actor}</h3>
                <p>Cast by {role.castBy}</p>
              </div>
              <div className="lens-role-reading">
                <Reading
                  reading={role.portrayal}
                  sources={sources}
                  label={`${role.actor}'s role`}
                />
              </div>
              <div className="lens-power">
                <h4>Power to act</h4>
                {role.power ? (
                  <Reading
                    reading={role.power}
                    sources={sources}
                    label={`${role.actor}'s power`}
                  />
                ) : (
                  <p className="living-subtle">
                    Decision-making power isn’t established in this evidence.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
      {lens.stage && (
        <section className="lens-stage">
          <p className="discovery-eyebrow">WHERE THIS READING PLACES US</p>
          {lens.stage.label === "unclear" ? (
            <h3>Stage unclear</h3>
          ) : (
            <ol aria-label="Possible story stages">
              {(
                ["beginning", "escalation", "crisis", "aftermath"] as const
              ).map((stage) => (
                <li
                  key={stage}
                  aria-current={
                    stage === lens.stage?.label ? "step" : undefined
                  }
                >
                  <span />
                  {stageNames[stage]}
                  {stage === lens.stage?.label && (
                    <small>Current reading</small>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Reading
            reading={lens.stage.reading}
            sources={sources}
            label="the story stage"
          />
        </section>
      )}
      {lens.signals.length > 0 && (
        <section className="lens-signals">
          <div className="lens-section-title">
            <p className="discovery-eyebrow">LOOK A LITTLE CLOSER</p>
            <h2>What else is shaping this story?</h2>
          </div>
          {lens.signals.map((signal, i) => (
            <article key={`${signal.kind}-${i}`}>
              <span className="lens-label">{signalNames[signal.kind]}</span>
              <h3><NarrativeText text={signal.title}/></h3>
              <p><NarrativeText text={signal.reading}/></p>
              <details className="lens-evidence">
                <summary>
                  Observation & limits <Plus size={14} />
                </summary>
                <h4>What is observed</h4>
                <p><NarrativeText text={signal.observation.claim}/></p>
                <Evidence reading={signal.observation} sources={sources} />
                {signal.pairedObservation && (
                  <>
                    <h4>The corresponding conduct or constraints</h4>
                    <p><NarrativeText text={signal.pairedObservation.claim}/></p>
                    <Evidence
                      reading={signal.pairedObservation}
                      sources={sources}
                    />
                  </>
                )}
                <h4>Another explanation</h4>
                <p><NarrativeText text={signal.alternative}/></p>
                <h4>What this cannot establish</h4>
                <p><NarrativeText text={signal.limitation}/></p>
              </details>
            </article>
          ))}
        </section>
      )}
      <section className="lens-alternative">
        <p className="discovery-eyebrow">ANOTHER WAY TO READ IT</p>
        <Reading
          reading={lens.alternative}
          sources={sources}
          label="the competing reading"
        />
      </section>
      <section className="lens-boundary">
        <p className="discovery-eyebrow">
          {lens.historical
            ? "WHERE THE PARALLEL BREAKS"
            : "WHAT THIS READING CAN’T ESTABLISH"}
        </p>
        <Reading
          reading={lens.boundary}
          sources={sources}
          label="the limits of the reading"
        />
      </section>
    </section>
  );
}
