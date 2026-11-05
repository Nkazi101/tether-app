import {historicalCaseTitle} from "../lib/historical-case-title";
import {hasHistoricalReading} from "../lib/reading-trajectory";
import {NarrativeText} from "../components/NarrativeText";
import {NarrativeReading} from "../components/NarrativeReading";
import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Radio,
  Link2,
  GitBranch,
  BookOpen,
  Search,
  Plus,
  Minus,
} from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../components/Toast";
import { LoadingState } from "../components/Editorial";
import {
  StoryPhoto,
  findStoryImage,
  reportingSource,
  shortText,
  openingText,
  sentenceCase,
  storyGenre,
  currentAccountEvidenceLabel,
} from "../components/StoryVisual";
import {
  useComparison,
  useReadingDesk,
  useReadingUpdate,
  useComparisonHistory,
  useFeedImages,
  useStoryImage,
  useBroaderResearch,
} from "../lib/comparison-client";
import { topicLabels, type Comparison } from "../lib/comparison";
import { buildAuthPath } from "../lib/routes";
import {
  ErrorNotice,
  Source,
  ResearchCoverage,
  RefineComparison,
  ObservationForm,
} from "../components/ComparisonTools";
import { ForecastJournal } from "./ForecastJournal";
import { LensReading } from "../components/StoryLens";
import { PairedOpening, PairedReading, CurrentReading } from "../components/PairedReading";

const date = (v: string) =>
  new Date(v).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const views = [
  { id: "connection", label: "The reading" },
  { id: "watch", label: "What to watch" },
  { id: "sources", label: "Sources & limits" },
] as const;
export function ComparisonPage() {
  const { id = "" } = useParams();
  const query = useComparison(id);
  const data = query.data?.comparison;
  const currentOnly = Boolean(data && !data.pairedStory && !data.narrativeLens && (data.inputMode === "reporting" || data.research?.version.startsWith("episode-research-") || data.currentFrame));
  const canWatch = Boolean(data?.primary && ["source-checked", "web-researched"].includes(data.primary.review) && data.indicators.length && (!data.research || data.research.temporalStage === "developing") && data.inputMode !== "walkthrough");
  const visibleViews = views.filter(v => v.id !== "watch" || (!currentOnly && (canWatch || !data?.research?.version.startsWith("episode-research-"))));
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const reading = useReadingDesk();
  const update = useReadingUpdate();
  const [params, setParams] = useSearchParams();
  const chooseView = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === "connection") nextParams.delete("view");
    else nextParams.set("view", next);
    setParams(nextParams);
    document
      .querySelector(".story-tabs")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const view = visibleViews.some((v) => v.id === params.get("view"))
    ? params.get("view")!
    : "connection";
  const [showJournal, setJournal] = useState(false);
  const lensIndex = params.get("lens") === "2" ? 1 : 0;
  const chooseLens = (index: number) => {
    const nextParams = new URLSearchParams(params);
    if (index === 0) nextParams.delete("lens");
    else nextParams.set("lens", "2");
    setParams(nextParams);
  };
  const history = useComparisonHistory(
    data?.situationId || "",
    view === "sources",
  );
  const media = useFeedImages();
  const photo = useStoryImage(data?.id || "");
  const broader = useBroaderResearch();
  const item = reading.data?.find(
    (i) => i.comparison.situationId === data?.situationId,
  );
  const saved = item?.savedAnalysisId === data?.id;
  const latest = item?.comparison.id || query.data?.latestId;
  useEffect(() => {
    if (
      data &&
      item?.following &&
      item.unread &&
      item.comparison.id === data.id &&
      !update.isPending
    )
      update.mutate({ situationId: data.situationId, lastReadId: data.id });
  }, [data?.id, item?.unread, item?.following]);
  useEffect(() => {
    setJournal(false);
  }, [id]);
  const signIn = () =>
    navigate(
      buildAuthPath(
        `/comparisons/${id}${params.size ? `?${params.toString()}` : ""}`,
      ),
    );
  async function keep(kind: "save" | "follow") {
    if (!user) {
      signIn();
      return;
    }
    if (!data) return;
    try {
      await update.mutateAsync({
        situationId: data.situationId,
        ...(kind === "save"
          ? { savedAnalysisId: saved ? null : data.id }
          : { following: !item?.following, lastReadId: data.id }),
      });
      showToast(
        kind === "save"
          ? saved
            ? "Removed from saved."
            : "This version is saved."
          : item?.following
            ? "You stopped following this story."
            : "You’re following this story.",
      );
    } catch (error) {
      showToast((error as Error).message);
    }
  }
  if (query.isLoading)
    return (
      <div className="page-wrap">
        <LoadingState label="Finding the thread…" />
      </div>
    );
  if (query.error || !data)
    return (
      <div className="page-wrap story-page">
        <Link to="/explore" className="text-link">
          <ArrowLeft size={16} />
          Discover
        </Link>
        <ErrorNotice
          error={query.error || new Error("This story is unavailable.")}
          retry={() => void query.refetch()}
        />
      </div>
    );
  const source = reportingSource(data);
  const lens = data.lenses[lensIndex] || data.lenses[0];
  const image = photo.data?.image || findStoryImage(data, media.data?.images);
  const allSources = [
    ...new Map(
      [...data.sources, ...(data.primary?.sources || []), ...data.alternatives.flatMap(a=>a.historicalCase.sources)].map((s) => [s.id, s]),
    ).values(),
  ];
  const stale =
    data.inputMode !== "walkthrough" &&
    source?.publishedAt &&
    Date.parse(source.publishedAt) < Date.now() - 48 * 3600000;
  return (
    <article className="page-wrap story-page">
      <div className="story-toolbar">
        <Link to="/explore">
          <ArrowLeft size={16} />
          Discover
        </Link>
        <div>
          <button
            disabled={update.isPending}
            onClick={() => void keep("save")}
            aria-label={saved ? "Unsave this version" : "Save this version"}
            className="story-save"
          >
            {saved ? <Check size={18} /> : <Bookmark size={18} />}
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
          {!(view==='connection'&&data.narrativeLens?.watch.length)&&<button
            className="discovery-secondary"
            disabled={update.isPending}
            onClick={() => void keep("follow")}
          >
            <Radio size={16} />
            {item?.following ? "Following" : "Follow story"}
          </button>}
        </div>
      </div>
      <header className="story-heading">
        <div className="story-kicker">
          <span>{topicLabels[data.topic]}{storyGenre(source) ? ` · ${storyGenre(source)}` : ""}</span>
          <span>
            {data.inputMode === "walkthrough"
              ? "Historical walkthrough · known outcomes"
              : `${source?.publisher || "Reader-submitted story"}${source?.publishedAt ? ` · ${date(source.publishedAt)}` : " · Date not established"}`}
          </span>
        </div>
        <h1>{data.title}</h1>
        {data.inputMode === "reporting" || data.inputMode === "walkthrough" ? <p className="story-recap">{openingText(source?.summary || data.context.summary, 230)}</p> : <details className="story-recap-detail"><summary>The account being compared</summary><p>{openingText(source?.summary || data.context.summary,230)}</p></details>}
        {source?.url&&<a className="story-original" href={source.url} target="_blank" rel="noreferrer">Read the original at {source.publisher}<ArrowUpRight size={16}/></a>}
      </header>
      {latest && latest !== data.id && (
        <p className="story-version">
          <GitBranch size={15} />
          You’re reading an earlier version.{" "}
          <Link to={`/comparisons/${latest}`}>Open the latest</Link>
        </p>
      )}
      {stale && (
        <p className="story-version">
          Reporting from {date(source!.publishedAt!)} · check the original
          source for newer developments.
        </p>
      )}
      {!data.pairedStory && !currentOnly && data.lenses.length > 1 && (
        <div className="lens-selector" aria-label="Choose a reading">
          {data.lenses.map((item, index) => (
            <button
              key={item.title}
              aria-pressed={lensIndex === index}
              onClick={() => chooseLens(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
      {data.narrativeLens ? <StoryPhoto className="current-opening" image={image} source={source} eager /> : data.pairedStory ? <PairedOpening comparison={data} image={image} /> : currentOnly ? <StoryPhoto className="current-opening" image={image} source={source} eager /> : <section
        className={`story-duet ${!data.primary ? "story-duet-open" : ""}`}
        aria-label={lens ? "The event and a possible reading" : "Now and then"}
      >
        <div className="story-now">
          <StoryPhoto image={image} source={source} eager />
          <span className="visual-now">
            {data.inputMode === "walkthrough" ? "THE EVENT" : "NOW"}
          </span>
        </div>
        <div className="story-then">
          <span className="duet-link">
            <Link2 size={22} />
          </span>
          {lens ? (
            <>
              <p className="discovery-eyebrow">
                THE STORY BENEATH THE STORY · A READING
              </p>
              <h2>{lens.title}</h2>
              <p>{lens.insight}</p>
              {data.primary && lens.historical && (
                <div className="lens-precedent">
                  <span>AN EARLIER EXPRESSION · {data.primary.period}</span>
                  <h3>{historicalCaseTitle(data.primary)}</h3>
                </div>
              )}
              {!lens.historical && (
                <div className="lens-precedent">
                  <p>
                    A historical equivalent for this reading hasn’t been
                    established yet.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="discovery-eyebrow">
                {data.primary
                  ? "THEN · A POSSIBLE PARALLEL"
                  : "THE SEARCH CONTINUES"}
              </p>
              {data.primary ? (
                <>
                  <div className="story-period">{data.primary.period}</div>
                  <h2>{historicalCaseTitle(data.primary)}</h2>
                  <p>
                    {sentenceCase(openingText(data.primary.initialState, 210))}
                  </p>
                </>
              ) : (
                <>
                  <h2>The connection is still open.</h2>
                  <p>
                    We haven’t established a useful historical parallel yet.
                    That’s a limit of this investigation—not a claim that
                    history has nothing to offer.
                  </p>
                  <Link to="/explore" className="text-link">
                    Discover another connection <ArrowRight size={16} />
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </section>}
      <div className="story-review">
        <div><span className="story-reading-kind">{hasHistoricalReading(data)?"Historical interpretation":currentOnly?"The reported account":"Historical research remains open"}</span><span>{currentAccountEvidenceLabel(data)}</span></div>
        <button onClick={() => chooseView("sources")}>
          See sources & limits <ArrowUpRight size={13} />
        </button>
      </div>
      <div
        className="story-tabs"
        role="tablist"
        aria-label="Explore this story"
      >
        {visibleViews.map((v, index) => (
          <button
            key={v.id}
            role="tab"
            id={`tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls={`panel-${v.id}`}
            tabIndex={view === v.id ? 0 : -1}
            onClick={() => chooseView(v.id)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === "ArrowRight") next = (index + 1) % visibleViews.length;
              if (event.key === "ArrowLeft")
                next = (index + visibleViews.length - 1) % visibleViews.length;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = visibleViews.length - 1;
              if (next !== undefined) {
                event.preventDefault();
                chooseView(visibleViews[next].id);
                document.getElementById(`tab-${visibleViews[next].id}`)?.focus();
              }
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      {views
        .filter((v) => v.id !== view)
        .map((v) => (
          <section
            key={v.id}
            hidden
            role="tabpanel"
            id={`panel-${v.id}`}
            aria-labelledby={`tab-${v.id}`}
          />
        ))}
      <section
        className="story-panel"
        role="tabpanel"
        id={`panel-${view}`}
        aria-labelledby={`tab-${view}`}
        tabIndex={0}
      >
        {view === "connection" && (data.narrativeLens ? <>{!hasHistoricalReading(data)&&<p className="pair-small">Earlier interpretation · this version has not met the current requirements for historical distance, distinct principal actors and source support. It remains available for reference.</p>}<NarrativeReading comparison={data} onFollow={()=>void keep("follow")} following={Boolean(item?.following)} followPending={update.isPending}/></> : data.pairedStory ? <PairedReading comparison={data} /> : currentOnly ? <><CurrentReading comparison={data} />{data.lenses.length > 0 && !data.research?.version.startsWith("episode-research-") && <details className="pair-detail legacy-reading"><summary>Earlier interpretation · previous method <Plus size={18} /></summary><p>This earlier interpretation has not been reassessed against the current historical-distance, distinct-actor and source requirements. It is retained for reference and has no current comparison badge.</p><LensReading lens={lens} sources={allSources} historicalTitle={data.primary?historicalCaseTitle(data.primary):undefined} /></details>}</> : (
          <>
            {lens && (
              <>
                <LensReading
                  lens={lens}
                  sources={allSources}
                  historicalTitle={data.primary?historicalCaseTitle(data.primary):undefined}
                />
              </>
            )}
            {data.primary ? (
              <>
                {!lens && (
                  <>
                    <div className="story-insight">
                      <span className="insight-number">01 / THE THREAD</span>
                      <h2>What history adds.</h2>
                      <p>{shortText(data.summary, 600)}</p>
                    </div>
                    <div className="story-difference">
                      <span>
                        <Link2 size={20} />
                      </span>
                      <div>
                        <p className="discovery-eyebrow">
                          THE DIFFERENCE THAT MATTERS
                        </p>
                        <p>
                          {data.differences[0] ||
                            data.primary.boundaries[0] ||
                            "This is a possible parallel, not a forecast of the same outcome."}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                <details className="story-disclosure">
                  <summary>
                    Compare the evidence <Plus size={18} />
                  </summary>
                  {data.correspondences.map((pair, index) => (
                    <section className="evidence-pair" key={index}>
                      <h3>{pair.relationship}</h3>
                      <div>
                        <EvidencePassage
                          label="Now"
                          text={pair.presentEvidence}
                          source={allSources.find(
                            (s) => s.id === pair.presentSourceId,
                          )}
                        />
                        <EvidencePassage
                          label="Then"
                          text={pair.historicalEvidence}
                          source={allSources.find(
                            (s) => s.id === pair.historicalSourceIds[0],
                          )}
                        />
                      </div>
                    </section>
                  ))}
                  {data.differences.slice(1).map((difference, i) => (
                    <p key={i} className="additional-difference">
                      <strong>Another difference. </strong>
                      <NarrativeText text={difference}/>
                    </p>
                  ))}
                </details>
                <details className="story-disclosure">
                  <summary>
                    What happened then <Plus size={18} />
                  </summary>
                  <ol className="story-timeline">
                    {data.primary.sequence.map((step, i) => (
                      <li key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <h3>{step.stage}</h3>
                          <p>{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="story-outcome">
                    <h3>The recorded outcome</h3>
                    <p>
                      {data.primary.outcome ||
                        "The outcome isn’t sufficiently documented."}
                    </p>
                    <p className="living-subtle">
                      An earlier outcome does not determine this story’s ending.
                    </p>
                  </div>
                </details>
                {!lens && data.narrative && (
                  <details className="story-disclosure narrative-disclosure">
                    <summary>
                      The human pattern <Plus size={18} />
                    </summary>
                    <p className="discovery-eyebrow">
                      Jung-inspired interpretation · not a factual finding
                    </p>
                    <h3>{data.narrative.title}</h3>
                    <p><NarrativeText text={data.narrative.interpretation}/></p>
                    <h4>Another way to read it</h4>
                    <p><NarrativeText text={data.narrative.alternative}/></p>
                    <p className="living-subtle">
                      A lens on the story, not a diagnosis of hidden motives.
                      Predictive value has not been established.
                    </p>
                  </details>
                )}
                <div className="story-next">
                  <div>
                    <p className="discovery-eyebrow">
                      THE STORY DOESN’T STOP HERE
                    </p>
                    <h3>
                      {canWatch
                        ? "Watch where it goes next."
                        : "Keep a little perspective."}
                    </h3>
                  </div>
                  <button
                    className="discovery-primary"
                    onClick={() => chooseView(canWatch ? "watch" : "sources")}
                  >
                    {canWatch ? "What to watch" : "Read the sources"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div className="story-open-copy">
                <h2>A good connection has to earn its place.</h2>
                <p>
                  Searching more periods, places and sources may reveal a
                  stronger precedent. You can inspect this investigation or
                  start a broader search.
                </p>
                <div>
                  <button
                    className="discovery-primary"
                    onClick={() => chooseView("sources")}
                  >
                    See the investigation <ArrowRight size={17} />
                  </button>
                  {(!data.research || data.research.depth < 3) && (
                    <button
                      className="discovery-secondary"
                      disabled={broader.isPending}
                      onClick={() =>
                        broader.mutate(data.id, {
                          onSuccess: (job) => navigate(`/requests/${job.id}`),
                        })
                      }
                    >
                      <Search size={16} />
                      {broader.isPending
                        ? "Opening search…"
                        : "Search more widely"}
                    </button>
                  )}
                </div>
                {broader.error && <p role="alert">{broader.error.message}</p>}
              </div>
            )}
          </>
        ))}
        {view === "watch" && (
          <>
            <div className="story-section-heading">
              <p className="discovery-eyebrow">FOLLOW THE FORK IN THE ROAD</p>
              <h2>
                {canWatch || data.narrativeLens?.watch.length
                  ? "What would change the picture?"
                  : "A connection isn’t a prediction."}
              </h2>
              <p>
                {canWatch || data.narrativeLens?.watch.length
                  ? "These are questions to follow as evidence develops."
                  : data.inputMode === "walkthrough"
                    ? "This example uses known outcomes. It can explain a pattern, but it cannot demonstrate foresight."
                    : "This assessment hasn’t established reliable forward-looking indicators. Sources and uncertainty are available in the next tab."}
              </p>
            </div>
            {data.narrativeLens&&<div className="narrative-watch">{data.narrativeLens.watch.map((w,i)=><article key={i}><h3><NarrativeText text={w.question}/></h3><p><NarrativeText text={w.why}/></p></article>)}</div>}
            {canWatch && (
              <>
                <div className="watch-grid">
                  {data.indicators.map((indicator, i) => (
                    <article key={indicator.id}>
                      <span className="watch-number">0{i + 1}</span>
                      <h3>{indicator.label}</h3>
                      <p>{indicator.question}</p>
                      <div className="watch-condition">
                        <Plus size={16} />
                        <div>
                          <h4>The pattern holds if</h4>
                          <p>{indicator.strengthens}</p>
                        </div>
                      </div>
                      <div className="watch-condition">
                        <Minus size={16} />
                        <div>
                          <h4>The comparison weakens if</h4>
                          <p>{indicator.weakens}</p>
                        </div>
                      </div>
                      <p className="watch-guidance">
                        Look for: {indicator.sourceGuidance} · Revisit over{" "}
                        {indicator.horizonDays} days.
                      </p>
                    </article>
                  ))}
                </div>
                {data.scenarios.length > 0 && (
                  <details className="story-disclosure">
                    <summary>
                      Possible paths <Plus size={18} />
                    </summary>
                    {data.scenarios.map((s) => (
                      <div className="story-scenario" key={s.id}>
                        <h3>{s.title}</h3>
                        <p>{s.condition}</p>
                        <p>{s.implication}</p>
                      </div>
                    ))}
                  </details>
                )}
                <details className="story-disclosure">
                  <summary>
                    Add something you’ve noticed <Plus size={18} />
                  </summary>
                  {user ? (
                    <ObservationForm comparison={data} />
                  ) : (
                    <button className="discovery-primary" onClick={signIn}>
                      Sign in to keep observations <ArrowRight size={16} />
                    </button>
                  )}
                </details>
              </>
            )}
            <div className="journal-entry">
              <BookOpen size={22} />
              <div>
                <h3>Your own prediction, on the record.</h3>
                <p>
                  Set a question, a deadline and what would count as an answer.
                </p>
              </div>
              <button
                className="discovery-secondary"
                aria-expanded={showJournal}
                onClick={() => setJournal(!showJournal)}
              >
                {showJournal ? "Close journal" : "Open your journal"}
                <ArrowRight size={16} />
              </button>
            </div>
            {showJournal &&
              (user ? (
                <ForecastJournal situationId={data.situationId} />
              ) : (
                <button className="discovery-primary" onClick={signIn}>
                  Sign in to record a forecast <ArrowRight size={16} />
                </button>
              ))}
          </>
        )}
        {view === "sources" && (
          <>
            <div className="story-section-heading">
              <p className="discovery-eyebrow">GO STRAIGHT TO THE EVIDENCE</p>
              <h2>Check the connection for yourself.</h2>
              <p>
                {allSources.length} sources · evidence captured{" "}
                {date(data.evidenceCutoff)}. {data.primary?.reviewNote}
              </p>
            </div>
            {data.unknowns.length > 0 && (
              <div className="story-unknowns">
                <h3>What we still don’t know</h3>
                <ul>
                  {data.unknowns.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="story-source-list">
              {allSources.map((s) => (
                <Source key={s.id} source={s} />
              ))}
            </div>
            <ResearchCoverage comparison={data} />
            {["web-research-4", "web-research-5"].includes(
              data.research?.version || "",
            ) &&
              !data.research?.narrativePlan && (
                <p className="living-subtle">
                  A pre-search narrative plan was not recorded for this version.
                  Inspect the actual queries and source limits below.
                </p>
              )}
            <details className="story-disclosure">
              <summary>
                Search scope & other candidates <Plus size={18} />
              </summary>
              {data.research?.narrativePlan && (
                <section className="lens-search-plan">
                  <h3>Readings considered before the historical search</h3>
                  <p>
                    These were starting hypotheses, not findings. The historical
                    evidence can change the reading.
                  </p>
                  {data.research.narrativePlan.hypotheses.map((hypothesis) => (
                    <div key={hypothesis.title}>
                      <h4>{hypothesis.title}</h4>
                      <p><NarrativeText text={hypothesis.observation.claim}/></p>
                      <p>Test against: {hypothesis.disconfirmingQuestion}</p>
                    </div>
                  ))}
                  {!data.research?.narrativePlan.hypotheses.length && (
                    <p>
                      The initial evidence did not support a narrative
                      hypothesis.
                    </p>
                  )}
                  <p>
                    Independent material search:{" "}
                    {data.research.narrativePlan.materialQuery}
                  </p>
                  <p>
                    Countercandidate search:{" "}
                    {data.research.narrativePlan.counterQuery}
                  </p>
                </section>
              )}
              {data.currentFrame&&<section><h3>Before the historical search</h3><p><NarrativeText text={data.currentFrame.abstraction}/></p><p>Account: {data.currentFrame.eventKind.replaceAll("-"," ")}. <NarrativeText text={data.currentFrame.reason}/></p></section>}
              {!data.currentFrame&&!data.research?.version.startsWith("episode-research-") && <><p>
                {data.scope.considered} accumulated cases considered:{" "}
                {data.scope.reviewedCases} source-checked and{" "}
                {data.scope.referenceCases} reference leads.
              </p>
              <p>{data.scope.note}</p></>}
              {data.alternatives.map((a) => (
                <section className="story-scenario" key={a.historicalCase.id}>
                  <h3>
                    {a.historicalCase.title} · {a.historicalCase.period}
                  </h3>
                  <p><NarrativeText text={a.reason}/></p>
                  <p>{a.historicalCase.reviewNote}</p>
                </section>
              ))}
              <p>
                No search certifies coverage of all history. Search and citation
                checks are automated.
              </p>
              <Link className="text-link" to="/method">
                Read the method <ArrowUpRight size={14} />
              </Link>
            </details>
            <details className="story-disclosure">
              <summary>
                What changed & earlier versions <GitBranch size={18} />
              </summary>
              {data.change && (
                <div>
                  <h3>{data.change.summary}</h3>
                  {data.change.reasons.map((v, i) => (
                    <p key={i}>{v}</p>
                  ))}
                </div>
              )}
              {data.forkOriginId && (
                <p>
                  Your private copy began with{" "}
                  <Link to={`/comparisons/${data.forkOriginId}`}>
                    this comparison
                  </Link>
                  .
                </p>
              )}
              {history.isLoading ? (
                <LoadingState label="Loading versions…" />
              ) : history.error ? (
                <ErrorNotice error={history.error} />
              ) : (
                <ol className="story-history">
                  {history.data?.map((v) => (
                    <li key={v.id}>
                      <Link to={`/comparisons/${v.id}`}>
                        {date(v.createdAt)} ·{" "}
                        {v.change?.summary || "Initial comparison"}
                        {v.id === data.id ? " · This version" : ""}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </details>
            <RefineComparison
              key={data.id}
              comparison={data}
              canRevise={Boolean(query.data?.canRevise)}
            />
          </>
        )}
      </section>
      <Link to="/explore" className="story-back-bottom">
        <ArrowLeft size={16} />
        Back to the stories
      </Link>
    </article>
  );
}
function EvidencePassage({
  label,
  text,
  source,
}: {
  label: string;
  text: string;
  source?: Comparison["sources"][number];
}) {
  return (
    <div>
      <p className="discovery-eyebrow">{label}</p>
      <p>{text}</p>
      {source?.url && (
        <a
          className="text-link"
          href={source.url}
          target="_blank"
          rel="noreferrer"
        >
          {source.publisher}
          <ArrowUpRight size={13} />
        </a>
      )}
    </div>
  );
}
