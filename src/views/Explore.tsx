import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  PageHeading,
  LoadingState,
  EmptyState,
  EvidenceBadge,
} from "../components/Editorial";
import { getPublicSignalLabel } from "../lib/archetypes";
import {
  useExploreDataQuery,
  useHistoricalEpisodesQuery,
  useHistoricalSearchQuery,
} from "../lib/queries";
import type { HistoricalParallel } from "../lib/muse";
import type { HistoricalEpisodeRecord } from "../lib/pipeline";

interface ExploreProps {
  onSelectParallel: (modern: string, historical: string) => void;
}

export function Explore({ onSelectParallel }: ExploreProps) {
  const [params, setParams] = useSearchParams();
  const submittedQuery = params.get("q") || "";
  const [query, setQuery] = useState(submittedQuery);
  const exploreQuery = useExploreDataQuery();
  const episodeQuery = useHistoricalEpisodesQuery();
  const searchQuery = useHistoricalSearchQuery(submittedQuery);
  useEffect(() => {
    setQuery(submittedQuery);
  }, [submittedQuery]);
  const explore = exploreQuery.data;
  const data = searchQuery.data;
  const primary = data?.primaryResults || data?.results || [];
  const exploratory = data?.exploratoryResults || [];
  const hasResults = primary.length + exploratory.length > 0;
  const search = (value: string) => {
    const next = value.trim();
    if (next) {
      setQuery(next);
      setParams({ q: next });
    }
  };
  const openPathway = (title: string) => {
    const [modern, historical] = title
      .split(" / ")
      .map((value) => value.trim());
    if (modern && historical) onSelectParallel(modern, historical);
    else search(title);
  };
  const inspectEpisode = (episode: HistoricalEpisodeRecord) => {
    search(`${episode.title}. ${episode.structural_pattern}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const renderResult = (
    result: HistoricalParallel,
    index: number,
    tentative = false,
  ) => (
    <button
      className="result-item"
      key={result.id}
      onClick={() =>
        onSelectParallel(result.modernEvent, result.historicalEvent)
      }
    >
      <div className="result-topline">
        <span className="result-number">
          {String(index + 1).padStart(2, "0")} /{" "}
          {tentative ? "A connection to investigate" : "Historical perspective"}
        </span>
        <EvidenceBadge state={tentative ? "emerging" : "verified"} />
      </div>
      <h3>{result.title}</h3>
      <p>{result.description}</p>
      <div className="result-bottom">
        <div className="result-tags">
          {result.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{getPublicSignalLabel(tag) || tag}</span>
          ))}
        </div>
        <ArrowUpRight size={19} />
      </div>
    </button>
  );

  return (
    <div className="page-wrap">
      <section className="explore-intro">
        <PageHeading
          eyebrow="Follow your curiosity"
          title={
            <>
              What does this
              <br />
              <em>remind you of?</em>
            </>
          }
          description="Bring a story from today. Find the historical connections that give it another dimension."
        />
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            search(query);
          }}
          role="search"
        >
          <Search size={20} strokeWidth={1.5} />
          <label className="sr-only" htmlFor="archive-query">
            Headline, link, or event to explore
          </label>
          <input
            id="archive-query"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What’s happening?"
          />
          <button
            className="button-primary"
            type="submit"
            disabled={!query.trim() || searchQuery.isFetching}
          >
            {searchQuery.isFetching ? "Searching…" : "Find connections"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="search-helper">
          The more specific the event, the more useful the perspective. Try who,
          what changed, and why it matters.
        </p>
        {!submittedQuery && (
          <div className="search-suggestions">
            <span>Try a question</span>
            {[
              "What happens when a new technology changes work?",
              "How do trade networks become fragile?",
            ].map((topic) => (
              <button key={topic} onClick={() => search(topic)}>
                {topic}
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
        )}
        {submittedQuery && (
          <button
            className="text-link"
            onClick={() => {
              setParams({});
              setQuery("");
            }}
          >
            <RotateCcw size={13} /> Start a new exploration
          </button>
        )}
      </section>
      {submittedQuery ? (
        searchQuery.isFetching ? (
          <LoadingState label="Looking for a historical connection…" />
        ) : searchQuery.isError ? (
          <div className="notice error" role="alert">
            <div>
              <strong>The archive couldn’t complete this search.</strong>
              <p>Your question is still here. Try again in a moment.</p>
              <button
                className="text-link"
                onClick={() => void searchQuery.refetch()}
              >
                Try the search again <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : !hasResults ? (
          <EmptyState
            title="No convincing connection yet."
            description="This part of the archive may be limited. Add a specific event, actor, or change to give the search more context."
            action="Edit your question"
            onAction={() => document.getElementById("archive-query")?.focus()}
          />
        ) : (
          <div className="results-layout">
            <div>
              {data?.queryInterpretation && (
                <div className="query-summary">
                  <p className="eyebrow">The pattern we’re investigating</p>
                  <p>{data.queryInterpretation.structuralSummary}</p>
                </div>
              )}
              {data?.archiveGap && (
                <div className="notice" style={{ marginBottom: 24 }}>
                  <div>
                    <strong>A useful lead, with limits.</strong>
                    <p>
                      The archive has limited coverage here. Read these
                      connections as starting points for investigation.
                    </p>
                  </div>
                </div>
              )}
              {primary.length > 0 && (
                <section>
                  <div className="section-heading">
                    <h2>Closest connections</h2>
                    <span>
                      {primary.length} historical{" "}
                      {primary.length === 1 ? "case" : "cases"}
                    </span>
                  </div>
                  {primary.map((result, index) => renderResult(result, index))}
                </section>
              )}
              {exploratory.length > 0 && (
                <section className="stream-section">
                  <div className="section-heading">
                    <h2>Worth investigating</h2>
                    <span>Less established</span>
                  </div>
                  {exploratory.map((result, index) =>
                    renderResult(result, index, true),
                  )}
                </section>
              )}
            </div>
            <aside className="result-support">
              <p className="eyebrow">Behind the connection</p>
              <h2>
                Resemblance
                <br />
                is a beginning.
              </h2>
              <p>
                A strong analogy shares underlying pressures. It also has
                limits: different people, institutions, and circumstances can
                lead to different outcomes.
              </p>
              {data?.archiveScope && (
                <>
                  <p>
                    <strong>{data.archiveScope.casesConsidered} cases</strong>{" "}
                    considered across {data.archiveScope.domainsCovered}{" "}
                    domains.
                  </p>
                  <p>
                    Archive coverage:{" "}
                    <strong>{data.archiveScope.evidenceDepth}</strong>
                  </p>
                  <details>
                    <summary>How the archive was searched</summary>
                    <p>
                      Cases are compared through mechanisms, actor roles,
                      archetypes, and counterexamples. Unreviewed discovery
                      episodes remain exploratory.
                    </p>
                    {data.archiveLenses?.map((lens) => (
                      <p key={`${lens.kind}-${lens.candidateId}`}>
                        <strong>{lens.kind.replaceAll("-", " ")}</strong>
                        <br />
                        {lens.title}
                      </p>
                    ))}
                  </details>
                </>
              )}
              <p>
                Match labels describe the archive comparison. They do not
                predict what happens next.
              </p>
            </aside>
          </div>
        )
      ) : (
        <>
          <div className="explore-layout">
            <section>
              <div className="section-heading">
                <h2>Somewhere to begin</h2>
                <span>Connections from the archive</span>
              </div>
              {exploreQuery.isLoading ? (
                <LoadingState label="Opening the reading list…" />
              ) : exploreQuery.isError ? (
                <EmptyState
                  title="The reading list is taking a moment."
                  description="You can still explore with the search above."
                  action="Reload reading list"
                  onAction={() => void exploreQuery.refetch()}
                />
              ) : (
                <div className="pathway-grid">
                  {explore?.recommendedPathways
                    .slice(0, 4)
                    .map((pathway, index) => {
                      const [modern, historical] = pathway.title.split(" / ");
                      return (
                        <button
                          className="pathway"
                          key={`${pathway.title}-${index}`}
                          onClick={() => openPathway(pathway.title)}
                        >
                          <div className="eyebrow">
                            {getPublicSignalLabel(pathway.archetype) ||
                              pathway.archetype}
                          </div>
                          <h3>{modern}</h3>
                          {historical && (
                            <div className="historical-connection">
                              <span
                                className="connection-glyph"
                                aria-hidden="true"
                              />
                              <div>
                                <p>Through the lens of</p>
                                <h4>{historical}</h4>
                              </div>
                            </div>
                          )}
                          <p>{pathway.description}</p>
                          <span className="text-link">
                            Examine the connection <ArrowUpRight size={15} />
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </section>
            <aside className="explore-aside">
              <p className="eyebrow">A different way in</p>
              <h2>Follow a pattern.</h2>
              {(explore?.trendingArchetypes || []).map((item) => (
                <button
                  className="pattern-link"
                  key={item.title}
                  onClick={() => search(item.title)}
                >
                  <span>{getPublicSignalLabel(item.title) || item.title}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
              <p>
                Big power shifts. New technologies. A loss of trust. History
                offers more than one lens on a story.
              </p>
            </aside>
          </div>
          <details className="discovery-section">
            <summary>
              <div>
                <p className="eyebrow">For a deeper search</p>
                <h2>At the edges of the archive.</h2>
              </div>
              <span>
                Discovery episodes <ChevronDown size={16} />
              </span>
            </summary>
            <p>
              These episodes are grouped from recurring signals in the GDELT
              event index. They are research leads, separate from the reviewed
              historical cases above.
            </p>
            {episodeQuery.isLoading ? (
              <LoadingState label="Opening the discovery index…" />
            ) : episodeQuery.isError ? (
              <p>
                The discovery index is unavailable right now. The curated
                archive is still searchable above.
              </p>
            ) : (
              <>
                <div className="discovery-list">
                  {episodeQuery.data?.episodes.slice(0, 6).map((episode) => (
                    <button
                      className="discovery-item"
                      key={episode.id}
                      onClick={() => inspectEpisode(episode)}
                    >
                      <div className="story-metadata">
                        <span>Unreviewed discovery episode</span>
                        <span>
                          {episode.start_date.slice(0, 4)}–
                          {episode.end_date.slice(0, 4)}
                        </span>
                      </div>
                      <h3>{episode.title}</h3>
                      <p>{episode.narrative_summary || episode.summary}</p>
                      <span className="text-link">
                        Investigate in the archive <ArrowRight size={14} />
                      </span>
                    </button>
                  ))}
                </div>
                {!episodeQuery.data?.episodes.length && (
                  <p>
                    No discovery episodes are available yet. Try the curated
                    search above.
                  </p>
                )}
                <p className="search-helper">{episodeQuery.data?.caveat}</p>
              </>
            )}
          </details>
        </>
      )}
    </div>
  );
}
