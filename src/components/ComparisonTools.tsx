import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, GitBranch } from "lucide-react";
import type { Comparison, EvidenceSource } from "../lib/comparison";
import {
  useCreateAnalysis,
  useBroaderResearch,
  useObservation,
} from "../lib/comparison-client";
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <div>
        <strong>
          {error instanceof Error ? error.message : "This could not be loaded."}
        </strong>
        {retry && (
          <button className="text-link" onClick={retry}>
            Try again <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
export function Source({ source }: { source: EvidenceSource }) {
  return (
    <article className="living-source" id={`source-${source.id}`}>
      <span className="eyebrow">
        {source.kind === "user-description"
          ? "Submitted material · not independently verified"
          : source.publisher}
      </span>
      <h3>{source.title}</h3>
      {source.readingScope&&<p className="living-meta">{source.readingScope}</p>}
      {source.exactPassages&&!source.readingScope && <p className="living-meta">Research summary · exact excerpts are cited separately.</p>}
      {source.historicalProvenance && <p className="living-subtle">{source.historicalProvenance.note}</p>}
      <p>
        {source.summary.length > 1000 && source.kind !== "user-description"
          ? source.summary.slice(0, 1000) + "…"
          : source.summary}
      </p>
      {Boolean(source.captions?.length)&&<details><summary>Captions supplied with the article</summary>{source.captions!.map((caption,i)=><p key={i}>{caption}</p>)}</details>}
      <div className="living-meta">
        {source.publishedAt
          ? `Published ${date(source.publishedAt)}`
          : "Publication date not established"}{" "}
        · Captured {date(source.retrievedAt)}
      </div>
      {source.url && (
        <a
          className="text-link"
          href={source.url}
          target="_blank"
          rel="noreferrer"
        >
          Read the source <ArrowUpRight size={14} />
        </a>
      )}
    </article>
  );
}

export function RefineComparison({
  comparison,
  canRevise,
}: {
  comparison: Comparison;
  canRevise: boolean;
}) {
  const [input, setInput] = useState("");
  const mutation = useCreateAnalysis();
  const navigate = useNavigate();
  return (
    <details className="living-details">
      <summary>
        {canRevise
          ? "Add newer evidence or refine the question"
          : "Explore this event in your own comparison"}
      </summary>
      <form
        className="living-observation"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(
            {
              input,
              question: comparison.question,
              ...(canRevise ? { situationId: comparison.situationId } : {}),
            },
            { onSuccess: (job) => navigate(`/requests/${job.id}`) },
          );
        }}
      >
        <p>
          {canRevise
            ? "Submit a newer article link or a description of the event as it now stands. Earlier assessments remain in the history."
            : "Start a private assessment with the evidence or question you want to investigate."}{" "}
          Include who is involved, what changed, when, and the alternatives
          available.
        </p>
        <label htmlFor="refined-event">Article link or event description</label>
        <textarea
          id="refined-event"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          minLength={12}
          maxLength={12000}
          rows={4}
          required
        />
        <button className="button-primary" disabled={mutation.isPending}>
          Reassess the comparison <ArrowRight size={15} />
        </button>
        {mutation.error && <ErrorNotice error={mutation.error} />}
      </form>
    </details>
  );
}
export function ResearchCoverage({ comparison }: { comparison: Comparison }) {
  const mutation = useBroaderResearch();
  const navigate = useNavigate();
  const research = comparison.research;
  return (
    <section className="living-research">
      <p className="eyebrow">Search coverage is separate from match quality</p>
      <h2>
        {research?.sourceAcquisition === "encoded-library" ? "The reference cases checked" : research?.sourceAcquisition === "agent-source-audit"
          ? "How this case was researched"
          : research?.status === "searched"
          ? "A historical search, with a trace"
          : research
            ? "The historical investigation is incomplete"
            : "Beyond the accumulated archive"}
      </h2>
      <p>
        {research?.note ||
          "The published assessment currently reflects accumulated cases. A wider historical search can investigate other periods, regions and kinds of event. This collection is not the boundary of history."}
      </p>
      {research && (
        <>
          <p className="living-meta">
            {research.sourceAcquisition === "encoded-library"
              ? `${research.libraryCasesChecked || 0} historical reference cases checked · retained sources · no new web search · `
              : `Pass ${research.depth} · ${research.queries.length} recorded search queries · ${research.sourcesLocated} source URLs located · ${research.sourcesRead} historical pages read · `}
            {date(research.searchedAt)}
          </p>
          <details>
            <summary>Inspect what was searched and considered</summary>
            <ol>
              {research.queries.map((query, index) => (
                <li key={index}>{query}</li>
              ))}
            </ol>
            {research.candidatesConsidered.length > 0 && (
              <p>
                Candidates considered:{" "}
                {research.candidatesConsidered.join("; ")}.
              </p>
            )}
            {Boolean(research.readPages?.length) && <><h3>Historical pages read</h3><ul>{research.readPages!.map(page => <li key={page.id}>{page.url ? <a href={page.url} target="_blank" rel="noreferrer">{page.title}</a> : page.title} · {page.publisher}</li>)}</ul><p>These include candidates that were not selected; inclusion does not make a page evidence for the final parallel.</p></>}
            <p>
              {research.sourceAcquisition === "agent-source-audit" || research.historicalReview === "agent-source-audit" ? "This source packet includes a recorded agent audit. Programmatic page-access limits and summary provenance are labelled above." : "Search and citation checks are automated."} Independent historical
              review and exhaustive coverage are not implied.
            </p>
          </details>
        </>
      )}
      {(!research || research.depth < 3) && (
        <button
          className="button-secondary"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate(comparison.id, {
              onSuccess: (job) => navigate(`/requests/${job.id}`),
            })
          }
        >
          {mutation.isPending
            ? "Opening a broader investigation…"
            : research
              ? "Search more broadly"
              : "Search beyond the archive"}{" "}
          <Search size={15} />
        </button>
      )}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
      <p className="living-subtle">
        A reader-requested investigation is private. Public reporting is also
        researched in the background as capacity becomes available.{" "}
        <Link to="/method">Read the method.</Link>
      </p>
    </section>
  );
}

export function ObservationForm({ comparison }: { comparison: Comparison }) {
  const [indicatorId, setIndicator] = useState(
    comparison.indicators[0]?.id || "",
  );
  const [direction, setDirection] = useState<
    "strengthens" | "weakens" | "unclear" | "retracted"
  >("unclear");
  const [text, setText] = useState("");
  const [sourceUrl, setSource] = useState("");
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const mutation = useObservation(comparison.situationId);
  const navigate = useNavigate();
  return (
    <form
      className="living-observation"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(
          {
            indicatorId,
            direction,
            text,
            ...(sourceUrl ? { sourceUrl } : {}),
            observedAt: new Date(`${observedAt}T00:00:00`).toISOString(),
          },
          { onSuccess: (job) => navigate(`/requests/${job.id}`) },
        );
      }}
    >
      <p>
        Keep a sourced observation in your own assessment. A public example
        becomes a private copy when you add to it.
      </p>
      <label htmlFor="observation-indicator">
        What does this observation affect?
      </label>
      <select
        id="observation-indicator"
        value={indicatorId}
        onChange={(event) => setIndicator(event.target.value)}
      >
        {comparison.indicators.map((item) => (
          <option value={item.id} key={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label htmlFor="observation-direction">
        How does it affect the comparison?
      </label>
      <select
        id="observation-direction"
        value={direction}
        onChange={(event) =>
          setDirection(event.target.value as typeof direction)
        }
      >
        <option value="unclear">The implication is unclear</option>
        <option value="strengthens">Supports the condition</option>
        <option value="weakens">Challenges the condition</option>
        <option value="retracted">Retracts an earlier observation</option>
      </select>
      <label htmlFor="observation-text">
        What changed, and why does it matter?
      </label>
      <textarea
        id="observation-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        minLength={12}
        maxLength={2000}
        rows={3}
        required
      />
      <label htmlFor="observation-source">Source link (optional)</label>
      <input
        id="observation-source"
        type="url"
        value={sourceUrl}
        onChange={(event) => setSource(event.target.value)}
        maxLength={2000}
      />
      <label htmlFor="observation-date">Date observed</label>
      <input
        id="observation-date"
        type="date"
        value={observedAt}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => setObservedAt(event.target.value)}
        required
      />
      <p className="living-subtle">
        Your interpretation is recorded as reader-reported. A link alone does
        not independently verify it.
      </p>
      <button className="button-primary" disabled={mutation.isPending}>
        Record and reassess <GitBranch size={15} />
      </button>
      {mutation.error && <ErrorNotice error={mutation.error} />}
    </form>
  );
}
