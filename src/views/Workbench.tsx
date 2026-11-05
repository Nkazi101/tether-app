import React, { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { EmptyState, LoadingState } from "../components/Editorial";
import type { Comparison, ReadingItem } from "../lib/comparison";
import {
  useCreateAnalysis,
  useAnalysisJob,
  usePublicReading,
  useReadingDesk,
  useArchive,
  useFeedImages,
} from "../lib/comparison-client";
import { useCurationsQuery } from "../lib/queries";
import { ConnectionCard, findStoryImage } from "../components/StoryVisual";
import { ErrorNotice } from "../components/ComparisonTools";

const stateLabels: Record<Comparison["state"], string> = {
  supported: "Supported correspondence",
  partial: "A partial comparison",
  "insufficient-evidence": "More evidence needed",
  "needs-clarification": "A clearer event needed",
};
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
function ReadingCard({ item }: { item: ReadingItem }) {
  const analysis = item.comparison;
  const published = analysis.sources.find(
    (source) => source.kind === "reporting" && source.publishedAt,
  )?.publishedAt;
  return (
    <article className="living-reading">
      <div className="living-meta">
        {analysis.inputMode === "walkthrough"
          ? "Historical walkthrough"
          : stateLabels[analysis.state]}{" "}
        ·{" "}
        {published && analysis.inputMode !== "walkthrough"
          ? `Reported ${date(published)}`
          : date(analysis.evidenceCutoff)}
        {item.unread && <span className="living-new">Assessment changed</span>}
      </div>
      <Link to={`/comparisons/${analysis.id}`}>
        <h3>{analysis.title}</h3>
      </Link>
      <p>
        {analysis.inputMode === "walkthrough"
          ? `Through ${analysis.primary?.title} · ${analysis.primary?.period}`
          : analysis.change?.summary ||
            (analysis.primary
              ? `Through ${analysis.primary.title} · ${analysis.primary.period}`
              : analysis.context.summary)}
      </p>
      <Link className="text-link" to={`/comparisons/${analysis.id}`}>
        {analysis.primary ? "Follow the connection" : "Inspect this report"}{" "}
        <ArrowRight size={14} />
      </Link>
    </article>
  );
}

export function ExplorePage() {
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get("q") || "");
  const [question, setQuestion] = useState(
    "What does history help us understand, and what should we watch next?",
  );
  const create = useCreateAnalysis();
  const readings = usePublicReading();
  const navigate = useNavigate();
  const walkthroughs =
    readings.data?.filter(
      (item) => item.comparison.inputMode === "walkthrough",
    ) || [];
  const reporting =
    readings.data?.filter(
      (item) => item.comparison.inputMode !== "walkthrough",
    ) || [];
  return (
    <div className="page-wrap living-home">
      <section className="living-intro">
        <p className="eyebrow">
          Nothing new under the sun. A question worth exploring.
        </p>
        <h1>
          See the pattern.
          <br />
          <em>Notice the difference.</em>
        </h1>
        <p className="living-deck">
          Bring a story from today. Find a useful precedent, understand the
          human story underneath, and follow where events take a different turn.
        </p>
        <form
          className="living-ask"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              { input, question },
              { onSuccess: (job) => navigate(`/requests/${job.id}`) },
            );
          }}
        >
          <label htmlFor="event-input">What is happening?</label>
          <textarea
            id="event-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste an article link, or describe who is involved and what changed…"
            minLength={12}
            maxLength={12000}
            required
            rows={3}
          />
          <details className="living-question">
            <summary>Something particular you want to understand?</summary>
            <label htmlFor="event-question">Your question</label>
            <input
              id="event-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
            />
          </details>
          <div className="living-ask-bottom">
            <span>
              Explore without an account. Submitted text stays private.
            </span>
            <button
              className="button-primary"
              disabled={input.trim().length < 12 || create.isPending}
            >
              {create.isPending
                ? "Opening your question…"
                : "Find a historical parallel"}{" "}
              <ArrowRight size={17} />
            </button>
          </div>
          <p className="living-privacy">
            Descriptions may be processed by AI to extract relationships. Tether
            shows what the evidence supports and keeps uncertain interpretations
            visible.
          </p>
        </form>
        {create.error && <ErrorNotice error={create.error} />}
        <div className="living-examples">
          <span>Try a description</span>
          {[
            "A war disrupts imported natural gas supplies and pushes energy prices higher.",
            "Factory workers stop production while bargaining for union recognition.",
            "A regulator abandons an antitrust case against a dominant technology platform.",
          ].map((example, index) => (
            <button
              key={example}
              onClick={() => {
                setInput(example);
                document.getElementById("event-input")?.focus();
              }}
            >
              {
                [
                  "A supply shock",
                  "Workers push back",
                  "An enforcement reversal",
                ][index]
              }{" "}
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
      </section>
      <section className="living-method">
        <div>
          <span>01</span>
          <h2>A useful precedent</h2>
          <p>Find the relationship beneath the headline.</p>
        </div>
        <div>
          <span>02</span>
          <h2>The difference that matters</h2>
          <p>Understand what could change the ending.</p>
        </div>
        <div>
          <span>03</span>
          <h2>A thread to follow</h2>
          <p>Return to evidence that changes the picture.</p>
        </div>
      </section>
      <section className="living-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">See the method in practice</p>
            <h2>History, with the evidence in view.</h2>
          </div>
          <Link className="text-link" to="/collections">
            Open the archive <BookOpen size={16} />
          </Link>
        </div>
        {readings.isLoading ? (
          <LoadingState label="Opening the reading desk…" />
        ) : readings.error ? (
          <ErrorNotice
            error={readings.error}
            retry={() => void readings.refetch()}
          />
        ) : walkthroughs.length ? (
          walkthroughs.map((item) => (
            <ReadingCard item={item} key={item.comparison.id} />
          ))
        ) : (
          <p>
            A comparison starts with your question. The archive is available to
            inspect while public walkthroughs are prepared.
          </p>
        )}
      </section>
      {reporting.length > 0 && (
        <section className="living-section">
          <p className="eyebrow">
            From the latest available reporting · dates shown on each story
          </p>
          <h2>Questions worth a wider view.</h2>
          <div className="living-reading-grid">
            {reporting.slice(0, 8).map((item) => (
              <ReadingCard item={item} key={item.comparison.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function AnalysisRequestPage() {
  const { id = "" } = useParams();
  const job = useAnalysisJob(id);
  if (job.data?.status === "succeeded" && job.data.resultId)
    return <Navigate to={`/comparisons/${job.data.resultId}`} replace />;
  return (
    <div className="page-wrap living-narrow">
      <Link className="text-link" to="/explore">
        ← Back to Explore
      </Link>
      {job.error ? (
        <ErrorNotice error={job.error} retry={() => void job.refetch()} />
      ) : job.data?.status === "failed" ? (
        <EmptyState
          title="This comparison needs another attempt."
          description={
            job.data.error ||
            "Your previous published comparisons are retained."
          }
          action="Return to your question"
          href="/explore"
        />
      ) : (
        <>
          <LoadingState
            label={
              job.data?.resumeAt
                ? `Research resumes ${new Date(job.data.resumeAt).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"})}.`
                : job.data?.status === "running"
                ? "Reading the evidence and comparing relationships…"
                : "Your question is in the reading queue…"
            }
          />
          <p className="living-subtle">
            {job.data?.resumeAt ? "The daily research allowance is in use. Your request is saved and will resume automatically. " : ""}
            You can leave this page and return to this link. The result will
            appear when it is ready.
          </p>
          <Link className="text-link" to="/explore">
            Keep exploring <ArrowRight size={15} />
          </Link>
        </>
      )}
    </div>
  );
}

export function ReadingDeskPage({
  following = false,
}: {
  following?: boolean;
}) {
  const { user } = useAuth();
  const reading = useReadingDesk();
  const legacy = useCurationsQuery(user?.id);
  const media = useFeedImages();
  const items = (reading.data || [])
    .filter((item) => (following ? item.following : item.saved))
    .map((item) =>
      following
        ? item
        : {
            ...item,
            comparison: item.savedComparison || item.comparison,
            unread: false,
          },
    );
  return (
    <div className="page-wrap discovery-page saved-page">
      <header className="discovery-intro">
        <div>
          <p className="discovery-eyebrow">Your threads</p>
          <h1>
            {following ? (
              <>
                A story keeps
                <br />
                <span>unfolding.</span>
              </>
            ) : (
              <>
                Good perspectives.
                <br />
                <span>Worth keeping.</span>
              </>
            )}
          </h1>
        </div>
        <p>
          {following
            ? "The stories you follow, with their latest connections. Look for the update marker when an assessment changes."
            : "Your saved versions, exactly as you read them. Follow a story to keep up with what happens next."}
        </p>
      </header>
      {reading.isLoading ? (
        <LoadingState label="Opening your reading desk…" />
      ) : reading.error ? (
        <ErrorNotice
          error={reading.error}
          retry={() => void reading.refetch()}
        />
      ) : items.length ? (
        <div className="discovery-grid">
          {items.map((item) => (
            <div key={item.comparison.id} className="saved-story">
              {item.unread && (
                <span className="saved-update">New assessment</span>
              )}
              <ConnectionCard
                story={item.comparison}
                image={findStoryImage(item.comparison, media.data?.images)}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            following
              ? "A question worth returning to."
              : "Some ideas are worth keeping."
          }
          description={
            following
              ? "Choose “Follow this story” on a comparison. Updates appear here when a new assessment is published."
              : "Save a version from any comparison to find it here."
          }
          action="Explore a connection"
          href="/explore"
        />
      )}
      {!following && Boolean(legacy.data?.length) && (
        <section className="living-section">
          <h2>Your earlier saved connections</h2>
          <p>
            These bookmarks predate versioned comparisons. Open one to reassess
            the event against today’s evidence rules.
          </p>
          {legacy.data?.map((item) => (
            <article className="living-reading" key={item.id}>
              <h3>{item.modernTitle}</h3>
              <p>Previously paired with {item.historicalTitle}</p>
              <Link
                className="text-link"
                to={`/explore?q=${encodeURIComponent(item.modernEvent)}`}
              >
                Reassess this event <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export function ArchivePage() {
  const archive = useArchive();
  const [reviewed, setReviewed] = useState(true);
  return (
    <div className="page-wrap">
      <header className="living-intro">
        <p className="eyebrow">The historical archive</p>
        <h1>
          Patterns with
          <br />
          <em>a paper trail.</em>
        </h1>
        <p className="living-deck">
          Inspect the precedents, sources and limitations. Source-checked cases
          and reference leads have different evidence depth.
        </p>
      </header>
      <div className="topic-list">
        <button aria-pressed={reviewed} onClick={() => setReviewed(true)}>
          Source-checked cases
        </button>
        <button aria-pressed={!reviewed} onClick={() => setReviewed(false)}>
          Reference leads
        </button>
      </div>
      {archive.isLoading ? (
        <LoadingState label="Opening the archive…" />
      ) : archive.error ? (
        <ErrorNotice error={archive.error} />
      ) : (
        (archive.data || [])
          .filter((item) =>
            reviewed
              ? item.review === "source-checked"
              : item.review !== "source-checked",
          )
          .map((item) => (
            <article className="living-reading" key={item.id}>
              <p className="eyebrow">
                {item.period} · {item.review.replaceAll("-", " ")}
              </p>
              <h2>{item.title}</h2>
              <p>{item.initialState}</p>
              <details>
                <summary>Evidence and limits</summary>
                <p>{item.reviewNote}</p>
                {item.boundaries.map((boundary) => (
                  <p key={boundary}>{boundary}</p>
                ))}
                {item.sources.map((source) => (
                  <p key={source.id}>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title} ↗
                      </a>
                    )}
                  </p>
                ))}
              </details>
            </article>
          ))
      )}
    </div>
  );
}

export function LegacyComparisonPage() {
  const [params] = useSearchParams();
  return (
    <Navigate
      to={`/explore?q=${encodeURIComponent(params.get("modern") || "")}`}
      replace
    />
  );
}
