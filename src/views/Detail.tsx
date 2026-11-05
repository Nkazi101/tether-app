import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  BookOpen,
  Radio,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  EvidenceBadge,
  LoadingState,
  EmptyState,
} from "../components/Editorial";
import type { DeepDiveData } from "../lib/muse";
import { useDeepDiveQuery, useSaveCurationMutation } from "../lib/queries";
import { useToast } from "../components/Toast";
import { useAuth } from "../components/AuthProvider";
import { appRoutes, buildAuthPath, buildDeepDivePath } from "../lib/routes";
import {
  buildEventInterpretation,
  buildOutcomeScenarios,
  resolveEventTypeSlug,
} from "../lib/archetypes";
interface DetailProps {
  modernEvent: string;
  historicalEvent: string;
  onBack: () => void;
}

function normalizeDeepDiveData(
  rawData: Partial<DeepDiveData> | undefined,
  historicalEvent: string,
  modernEvent: string,
): DeepDiveData | null {
  if (!rawData) {
    return null;
  }

  const fallbackInsight =
    rawData.aiInsight ||
    "The same pressure pattern keeps resurfacing even when the names and technology change.";
  const fallbackPeopleInPlay = rawData.peopleInPlay || {
    eventArchetype:
      rawData.coreParallel?.tags?.[0] || "Recurring Historical Pattern",
    eventMeaning: fallbackInsight,
    actors: [],
  };
  const eventTypeSlug = resolveEventTypeSlug(
    rawData.eventInterpretation?.eventTypeSlug ||
      fallbackPeopleInPlay.eventArchetype,
  );
  const peopleInPlay = {
    eventArchetype:
      fallbackPeopleInPlay.eventArchetype || "Recurring Historical Pattern",
    eventMeaning: fallbackPeopleInPlay.eventMeaning || fallbackInsight,
    actors: Array.isArray(fallbackPeopleInPlay.actors)
      ? fallbackPeopleInPlay.actors
      : [],
  };

  return {
    status:
      rawData.status === "insufficient-match" ? "insufficient-match" : "ready",
    pairState: rawData.pairState || "emerging",
    whyThisPair:
      rawData.whyThisPair ||
      "This pair is still useful to read while Tether fills in more pair-specific context.",
    disanalogies: Array.isArray(rawData.disanalogies)
      ? rawData.disanalogies
      : [],
    alternativeParallels: Array.isArray(rawData.alternativeParallels)
      ? rawData.alternativeParallels
      : [],
    confidenceScore:
      typeof rawData.confidenceScore === "number"
        ? rawData.confidenceScore
        : null,
    coverageScore:
      typeof rawData.coverageScore === "number" ? rawData.coverageScore : null,
    archiveScope: rawData.archiveScope,
    archiveLenses: Array.isArray(rawData.archiveLenses)
      ? rawData.archiveLenses
      : [],
    coreParallel: {
      title:
        rawData.coreParallel?.title || `${historicalEvent} / ${modernEvent}`,
      tags:
        Array.isArray(rawData.coreParallel?.tags) &&
        rawData.coreParallel.tags.length > 0
          ? rawData.coreParallel.tags
          : ["Historical Pattern"],
    },
    historical: {
      title: rawData.historical?.title || historicalEvent,
      description: rawData.historical?.description || historicalEvent,
      ripples: Array.isArray(rawData.historical?.ripples)
        ? rawData.historical.ripples
        : [],
      ultimateOutcome: {
        title:
          rawData.historical?.ultimateOutcome?.title || "Historical Lesson",
        description:
          rawData.historical?.ultimateOutcome?.description ||
          rawData.historical?.description ||
          fallbackInsight,
      },
    },
    modern: {
      title: rawData.modern?.title || modernEvent,
      description: rawData.modern?.description || modernEvent,
      ripples: Array.isArray(rawData.modern?.ripples)
        ? rawData.modern.ripples
        : [],
      projectedTrajectory: {
        title:
          rawData.modern?.projectedTrajectory?.title || "Projected Trajectory",
        description:
          rawData.modern?.projectedTrajectory?.description ||
          rawData.modern?.description ||
          fallbackInsight,
      },
    },
    peopleInPlay,
    eventInterpretation:
      rawData.eventInterpretation ||
      buildEventInterpretation(eventTypeSlug, [], peopleInPlay.actors),
    outcomeScenarios:
      Array.isArray(rawData.outcomeScenarios) &&
      rawData.outcomeScenarios.length > 0
        ? rawData.outcomeScenarios
        : buildOutcomeScenarios(eventTypeSlug, [], peopleInPlay.actors),
    sources: Array.isArray(rawData.sources) ? rawData.sources : [],
    aiInsight: fallbackInsight,
  };
}

export function Detail({ modernEvent, historicalEvent, onBack }: DetailProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useDeepDiveQuery(historicalEvent, modernEvent);
  const saveMutation = useSaveCurationMutation(user?.id);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(false);
  }, [modernEvent, historicalEvent]);
  const data = normalizeDeepDiveData(query.data, historicalEvent, modernEvent);
  const save = async () => {
    if (!user) {
      showToast("Sign in to keep this comparison.");
      navigate(buildAuthPath(buildDeepDivePath(modernEvent, historicalEvent)));
      return;
    }
    if (!data) return;
    try {
      await saveMutation.mutateAsync({
        modernTitle: data.modern.title,
        historicalTitle: data.historical.title,
        modernEvent,
        historicalEvent,
        description: data.coreParallel.title,
        imageUrl: "",
        link: "",
      });
      setSaved(true);
      showToast("Added to your saved parallels.");
    } catch {
      showToast("Could not save this comparison. Please try again.");
    }
  };
  if (query.isLoading && !data)
    return (
      <div className="page-wrap detail-wrap">
        <button className="text-link" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to your reading
        </button>
        <LoadingState label="Reading between the events…" />
      </div>
    );
  if (!data)
    return (
      <div className="page-wrap detail-wrap">
        <button className="text-link" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to your reading
        </button>
        <EmptyState
          title="This comparison is unavailable for a moment."
          description="The archive couldn’t complete the comparison. Your place in the reading list is still there."
          action="Try again"
          onAction={() => void query.refetch()}
        />
      </div>
    );
  const limited = data.status === "insufficient-match";
  const sources = data.sources || [];
  const scenarios = data.outcomeScenarios || [];
  return (
    <article className="page-wrap detail-wrap">
      <div className="detail-toolbar">
        <button className="text-link" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to your reading
        </button>
        <button
          className="button-secondary"
          disabled={saved || saveMutation.isPending}
          onClick={() => void save()}
        >
          {saved ? <Check size={15} /> : <Bookmark size={15} />}
          {saved
            ? "Saved"
            : saveMutation.isPending
              ? "Saving…"
              : "Save comparison"}
        </button>
      </div>
      <header className="detail-heading">
        <EvidenceBadge state={data.pairState} />
        <h1>
          {limited ? "A connection to question." : data.coreParallel.title}
        </h1>
        <p>{data.whyThisPair}</p>
      </header>
      {limited && (
        <div className="notice" style={{ marginBottom: 24 }}>
          <div>
            <strong>The evidence doesn’t yet support a full analogy.</strong>
            <p>
              These events can still be examined together. Keep the differences
              in view and consider the alternative cases below.
            </p>
          </div>
        </div>
      )}
      <nav className="detail-subnav" aria-label="Within this comparison">
        <a href="#comparison">The two stories</a>
        <a href="#differences">The differences</a>
        <a href="#evidence">Sources</a>
        <a href="#people">People & pressure</a>
        <a href="#scenarios">What to watch</a>
      </nav>
      <section
        className="pair-comparison"
        id="comparison"
        aria-label="Current event and historical context"
      >
        <div className="pair-side">
          <p className="eyebrow">
            <Radio size={13} />
            Now / Current event
          </p>
          <h2>{data.modern.title}</h2>
          <p>{data.modern.description}</p>
        </div>
        <div className="pair-side then">
          <p className="eyebrow">
            <BookOpen size={13} />
            Then / Historical context
          </p>
          <h2>{data.historical.title}</h2>
          <p>{data.historical.description}</p>
        </div>
      </section>
      <section className="detail-section" id="differences">
        <p className="eyebrow">The limits are part of the story</p>
        <h2>Where the parallel breaks.</h2>
        {data.disanalogies.length ? (
          <ul className="caveat-list">
            {data.disanalogies.map((note, index) => (
              <li key={note}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Specific differences have not been established in this analysis. A
            shared pattern does not establish an identical cause, context, or
            outcome.
          </p>
        )}
      </section>
      <section className="detail-section" id="evidence">
        <p className="eyebrow">Read it for yourself</p>
        <h2>The evidence on the desk.</h2>
        <p>
          The comparison is an interpretation of the material below. Check the
          original reporting and historical sources before drawing a conclusion.
        </p>
        {sources.length ? (
          <div className="source-list">
            {sources.map((source, index) => (
              <div className="source-item" key={`${source.label}-${index}`}>
                <p className="eyebrow">
                  {source.kind === "current-reporting"
                    ? "Current reporting"
                    : "Historical reference"}
                </p>
                <h3>{source.label}</h3>
                <p>
                  {[
                    source.publisher,
                    source.publishedAt
                      ? new Date(source.publishedAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {source.url ? (
                  <a
                    className="text-link"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the source <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <p>Source link unavailable</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="notice" style={{ marginTop: 20 }}>
            Source references are not available for this comparison. Treat the
            analysis as an unverified starting point.
          </div>
        )}
        {data.archiveScope && (
          <details className="archive-method">
            <summary>
              How this comparison was assembled ·{" "}
              {data.archiveScope.casesConsidered} cases considered
            </summary>
            <p>
              The archive considered cases across{" "}
              {data.archiveScope.domainsCovered} domains, including{" "}
              {data.archiveScope.casesWithOutcomes} with recorded outcomes. The
              available evidence depth is {data.archiveScope.evidenceDepth}.
            </p>
            {data.confidenceScore != null && (
              <p>
                Internal match score: {Math.round(data.confidenceScore * 100)}%.
                This is a ranking signal, not a calibrated probability or a
                prediction.
              </p>
            )}
            {data.archiveLenses?.map((lens) => (
              <p key={`${lens.kind}-${lens.candidateId}`}>
                <strong>
                  {lens.kind.replaceAll("-", " ")}: {lens.title}
                </strong>
                <br />
                {lens.reason}
              </p>
            ))}
          </details>
        )}
      </section>
      {data.aiInsight && (
        <aside className="detail-synthesis">
          <p className="eyebrow">A working interpretation · AI-assisted</p>
          <blockquote>{data.aiInsight}</blockquote>
        </aside>
      )}
      <section className="detail-section">
        <p className="eyebrow">Follow the consequences</p>
        <h2>What changed. What could change.</h2>
        <div className="ripple-grid">
          <div>
            <p className="eyebrow">Then / The historical sequence</p>
            {data.historical.ripples.map((ripple, index) => (
              <div className="ripple-item" key={index}>
                <h3>{ripple.title}</h3>
                <p>{ripple.description}</p>
              </div>
            ))}
            <div className="outcome-note">
              <p className="eyebrow">Recorded outcome</p>
              <h3>{data.historical.ultimateOutcome.title}</h3>
              <p>{data.historical.ultimateOutcome.description}</p>
            </div>
          </div>
          <div>
            <p className="eyebrow">Now / The developing story</p>
            {data.modern.ripples.map((ripple, index) => (
              <div className="ripple-item" key={index}>
                <h3>{ripple.title}</h3>
                <p>{ripple.description}</p>
              </div>
            ))}
            <div className="outcome-note">
              <p className="eyebrow">Possible direction · conditional</p>
              <h3>{data.modern.projectedTrajectory.title}</h3>
              <p>{data.modern.projectedTrajectory.description}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="detail-section" id="people">
        <p className="eyebrow">People & pressure</p>
        <h2>{data.peopleInPlay.eventArchetype}</h2>
        <p>{data.peopleInPlay.eventMeaning}</p>
        {data.peopleInPlay.actors.length ? (
          <div className="actor-grid">
            {data.peopleInPlay.actors.map((actor) => (
              <article
                className="actor-item"
                key={`${actor.actor}-${actor.personaArchetype}`}
              >
                <p className="eyebrow">{actor.structuralRoleLabel}</p>
                <h3>{actor.actor}</h3>
                <h4>{actor.personaLabel}</h4>
                <p>{actor.playOut}</p>
                <details>
                  <summary>Look at their incentives</summary>
                  <p>
                    <strong>What they want:</strong> {actor.coreDrive}
                  </p>
                  <p>
                    <strong>Under pressure:</strong> {actor.stressBehavior}
                  </p>
                  <p>
                    <strong>Watch for:</strong> {actor.likelyDownfall}
                  </p>
                  <p>
                    {actor.derivedFrom === "actor-role"
                      ? "Interpreted from actor-role signals."
                      : "A pattern-based interpretation, rather than direct evidence about this person."}
                  </p>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p>
            There is not enough actor-specific evidence to interpret individual
            roles yet.
          </p>
        )}
      </section>
      <section className="detail-section" id="scenarios">
        <p className="eyebrow">What to watch</p>
        <h2>More than one way forward.</h2>
        <p>
          Historical outcomes suggest questions to watch, rather than a fixed
          prediction. These scenarios depend on the conditions described.
        </p>
        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <article className="scenario-item" key={scenario.id}>
              <p className="eyebrow">
                Scenario {String(index + 1).padStart(2, "0")} ·{" "}
                {scenario.likelihood.replaceAll("-", " ")}
              </p>
              <h3>{scenario.title}</h3>
              <p>{scenario.description}</p>
              <h4>More likely when</h4>
              <ul>
                {scenario.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
              <h4>Watch for</h4>
              <ul>
                {scenario.watchFor.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      {data.alternativeParallels.length > 0 && (
        <section className="detail-section">
          <p className="eyebrow">Keep the question open</p>
          <h2>Another way to read this.</h2>
          {data.alternativeParallels.map((candidate) => (
            <button
              className="result-item"
              key={candidate.title}
              onClick={() => {
                navigate(
                  buildDeepDivePath(
                    modernEvent,
                    candidate.title,
                    appRoutes.feed,
                  ),
                );
                window.scrollTo(0, 0);
              }}
            >
              <h3>{candidate.title}</h3>
              <p>{candidate.reason}</p>
              <span className="text-link">
                Examine this perspective <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </section>
      )}
    </article>
  );
}
