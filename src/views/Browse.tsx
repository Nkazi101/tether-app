import {historicalCaseTitle,historicalCasePeriod} from "../lib/historical-case-title";
import {historicalResult,hasHistoricalReading} from "../lib/reading-trajectory";
import {selectFeaturedComparisons} from "../lib/discovery-diversity";
import {CoverageGrid} from "../components/CoverageGrid";
import { useAuth } from "../components/AuthProvider";
import { useCurrentUserProfileQuery } from "../lib/queries";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  X,
  Link2,
} from "lucide-react";
import {
  useBrowseNews,
  useDiscoveryNews,
  useResearchCoverage,
  useCreateAnalysis,
  useBrowseConnections,
  useFeedImages,
  usePublicReading,
} from "../lib/comparison-client";
import { topicLabels, topicSchema, type NewsTopic } from "../lib/comparison";
import {
  ConnectionCard,
  currentAccountEvidenceLabel,
  StoryPhoto,
  findStoryImage,
  reportingSource,
  shortText,
  browsePeriod,
  openingText,
  storyGenre,
} from "../components/StoryVisual";

export function BringStory({ initial = "" }: { initial?: string }) {
  const [input, setInput] = useState(initial);
  const [question, setQuestion] = useState(
    "What does history help us understand, and what should we watch next?",
  );
  const create = useCreateAnalysis();
  const navigate = useNavigate();
  return (
    <form
      className="living-ask browse-ask"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          { input, question },
          { onSuccess: (job) => navigate(`/requests/${job.id}`) },
        );
      }}
    >
      <label htmlFor="event-input">
        Bring a link, a question, or something you’ve noticed.
      </label>
      <textarea
        id="event-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        minLength={12}
        maxLength={12000}
        rows={3}
        placeholder="Paste an article link or describe what is happening…"
        required
      />
      <details className="living-question">
        <summary>What would you like to understand?</summary>
        <label htmlFor="event-question">Your question</label>
        <input
          id="event-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          minLength={5}
          maxLength={500}
        />
      </details>
      <div className="living-ask-bottom">
        <span>No account needed to explore.</span>
        <button
          className="button-primary"
          disabled={create.isPending || input.trim().length < 12}
        >
          {create.isPending ? "Opening your investigation…" : "Search history"}{" "}
          <Search size={16} />
        </button>
      </div>
      <p className="living-privacy">
        Your submission stays private in Tether. Text and search terms may be
        processed by the AI and search providers used for the investigation.
      </p>
      {create.error && <p role="alert">{create.error.message}</p>}
    </form>
  );
}
export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const selected = topicSchema.safeParse(params.get("topic"));
  const topic: NewsTopic | "all" = selected.success ? selected.data : "all";
  const [bring, setBring] = useState(
    Boolean(params.get("q") || params.has("bring")),
  );
  useEffect(() => {
    if (params.has("bring")) {
      setBring(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [params]);
  useEffect(() => {
    if (bring)
      document.getElementById("event-input")?.focus({ preventScroll: true });
  }, [bring]);
  const { user } = useAuth();
  const profile = useCurrentUserProfileQuery(user?.id);
  const favorites = profile.data?.preferences.preferred_domains || [];
  const news = useBrowseNews(topic);
  const discovery = useDiscoveryNews(topic === "all");
  const coverage = useResearchCoverage();
  const connections = useBrowseConnections(topic);
  const media = useFeedImages();
  const end = useRef<HTMLDivElement>(null);
  const items = [
    ...new Map(
      [...(topic === "all" ? discovery.data || [] : []), ...(news.data?.pages.flatMap(p => p.items.map(i => i.comparison)) || [])].map(comparison => [comparison.situationId, comparison]),
    ).values(),
  ];
  const priority = [
    "entertainment",
    "technology",
    "science",
    "culture",
    "business",
    "sports",
    "lifestyle",
    "environment",
    "health",
    "world",
    "politics",
    "general",
  ];
  const ready = (connections.data || [])
    .filter(
      (s) => Boolean(hasHistoricalReading(s) && s.primary),
    )
    .sort(
      (a, b) =>
        Number(favorites.includes(b.topic)) -
          Number(favorites.includes(a.topic)) ||
        Number(b.lenses.some((lens) => lens.historical)) -
          Number(a.lenses.some((lens) => lens.historical)) ||
        priority.indexOf(a.topic) - priority.indexOf(b.topic),
    );
  const featureCandidates = ready.filter(
    (s) =>
      !/\b(charged|assault|injunction|rape|killed|dead|strikes|war)\b/i.test(
        s.title,
      ),
  );
  const preferredHero=featureCandidates[0]||ready[0];
  const {hero,featured}=selectFeaturedComparisons(ready,{heroId:preferredHero?.id,limit:7});
  const featuredIds = new Set(
    [hero, ...featured].filter(Boolean).map((s) => s!.situationId),
  );
  const remaining = items.filter((s) => !featuredIds.has(s.situationId));
  const images = media.data?.images;
  useEffect(() => {
    const target = end.current;
    if (!target || !news.hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !news.isFetchingNextPage)
          void news.fetchNextPage();
      },
      { rootMargin: "350px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    news.hasNextPage,
    news.isFetchingNextPage,
    news.fetchNextPage,
    items.length,
  ]);
  return (
    <div className="page-wrap discovery-page">
      <header className="discovery-intro">
        <div>
          <p className="discovery-eyebrow">TETHER · NEWS THROUGH HISTORY</p>
          <h1>See today <span>with a little distance.</span></h1>
        </div>
        <p>
          Browse the news. Put two stories side by side.
          See what lines up—and what changes the picture.
        </p>
      </header>
      <nav className="discovery-topics" aria-label="News categories">
        <button aria-pressed={topic === "all"} onClick={() => setParams({})}>
          Discover
        </button>
        {priority
          .filter((t) => t !== "general")
          .map((t) => (
            <button
              key={t}
              aria-pressed={topic === t}
              onClick={() => setParams({ topic: t })}
            >
              {
                (
                  {
                    entertainment: "Entertainment",
                    technology: "Tech",
                    science: "Science",
                    culture: "Culture",
                    business: "Money & work",
                    sports: "Sport",
                    lifestyle: "Life",
                    environment: "Planet",
                    health: "Health",
                    world: "World",
                    politics: "Politics",
                  } as Record<string, string>
                )[t]
              }
            </button>
          ))}
      </nav>
      {bring && (
        <section className="discovery-bring">
          <div className="discovery-section-title">
            <h2>Your story, a wider lens.</h2>
            <button
              className="text-link"
              onClick={() => {
                setBring(false);
                setParams(topic === "all" ? {} : { topic });
              }}
            >
              Close <X size={18} />
            </button>
          </div>
          <BringStory initial={params.get("q") || ""} />
        </section>
      )}
      {hero && (
        <section className="discovery-feature" aria-label="Featured connection">
          <Link
            to={`/comparisons/${hero.id}`}
            className="feature-visual"
            aria-label={`Explore: ${hero.title}`}
          >
            <StoryPhoto
              image={findStoryImage(hero, images)}
              source={reportingSource(hero)}
              eager
            />
            <span className="visual-now">
              NOW <span>{topicLabels[hero.topic]}</span>
            </span>
            <div className="feature-then">
              <span className="then-year" title={historicalCasePeriod(hero.primary!)}>
                THEN · {browsePeriod(historicalCasePeriod(hero.primary!))}
              </span>
              <span className="then-label">COMPARE THE STORIES</span>
              <h3>{historicalCaseTitle(hero.primary!)}</h3>
              <span className="then-thread">
                <Link2 size={20} />
              </span>
            </div>
          </Link>
          <div className="feature-copy">
            <p className="discovery-eyebrow">
              {topicLabels[hero.topic]}{storyGenre(reportingSource(hero)) ? ` · ${storyGenre(reportingSource(hero))}` : ""} · {hero.pairedStory ? `${hero.pairedStory.alignment.counts.beats} aligned moments` : "Historical context"}
            </p>
            <h2>
              <Link to={`/comparisons/${hero.id}`}>{hero.title}</Link>
            </h2>
            <p>{openingText(reportingSource(hero)?.summary || hero.context.summary, 230)}</p>
            {hero.narrativeLens&&<p className="feature-reading"><span>A READING</span>{hero.narrativeLens.insight.title}</p>}
            {historicalResult(hero)&&<p className="feature-result"><span>THE EARLIER RESULT</span>{openingText(historicalResult(hero)!.text,200)}</p>}
            <Link className="discovery-primary" to={`/comparisons/${hero.id}`}>
              See how today compares <ArrowRight size={18} />
            </Link>
            <span className="feature-caveat">
              {currentAccountEvidenceLabel(hero)}
            </span>
          </div>
        </section>
      )}
      {featured.length > 0 && (
        <section className="discovery-section">
          <div className="discovery-section-title">
            <h2>Put the stories together.</h2>
            <span>Start with whatever catches your eye.</span>
          </div>
          <div className="discovery-grid">
            {featured.map((story) => (
              <ConnectionCard
                key={story.id}
                story={story}
                image={findStoryImage(story, images)}
              />
            ))}
          </div>
        </section>
      )}
      <section className="discovery-section">
        <div className="discovery-section-title">
          <h2>
            {topic === "all"
              ? "The world keeps moving."
              : `More in ${topicLabels[topic]}`}
          </h2>
          <span>{topic === "all" && discovery.data?.length ? "A mix of recent stories" : "Latest available reporting"} · dates on every story</span>
        </div>
        {news.isLoading || (topic === "all" && discovery.isLoading) ? (
          <div className="discovery-skeleton" aria-label="Loading stories">
            <span />
            <span />
            <span />
          </div>
        ) : news.error ? (
          <div className="notice error" role="alert">
            <p>{news.error.message}</p>
            <button onClick={() => void news.refetch()}>Try again</button>
          </div>
        ) : remaining.length ? (
          <div className="discovery-grid">
            {remaining.map((story) => (
              <ConnectionCard
                key={story.id}
                story={story}
                image={findStoryImage(story, images)}
              />
            ))}
          </div>
        ) : !hero ? (
          <div className="discovery-empty">
            <h3>There’s more to explore.</h3>
            <p>Reporting in this category isn’t available right now.</p>
            <button
              className="discovery-primary"
              onClick={() => setBring(true)}
            >
              Bring a story <Plus size={17} />
            </button>
          </div>
        ) : null}
        {topic === "all" && discovery.error && <p className="discovery-mix-error" role="status">The category mix couldn’t load. Showing latest reporting. <button onClick={() => void discovery.refetch()}>Try again</button></p>}
        <div ref={end} className="browse-more">
          {news.hasNextPage && (
            <button
              className="discovery-secondary"
              onClick={() => void news.fetchNextPage()}
              disabled={news.isFetchingNextPage}
            >
              {news.isFetchingNextPage ? "Loading more…" : "More to discover"}
              <ArrowRight size={16} />
            </button>
          )}
          {news.isFetchNextPageError && (
            <p role="alert">Couldn’t load more stories. Try again.</p>
          )}
        </div>
      </section>
      {coverage.data && <p className="discovery-coverage"><strong>{coverage.data.progress.publishedComparisons} comparisons published</strong> · {coverage.data.progress.queuedInvestigations} investigations queued. <Link to="/method#coverage">See coverage and limits <ArrowUpRight size={12} /></Link></p>}
      <section className="discovery-explainer">
        <span className="explainer-symbol">
          <Link2 size={29} />
        </span>
        <div>
          <h2>One story can change how you see another.</h2>
          <p>
            Follow the actions in two events. Explore a possible shared pattern,
            then test it against the differences. The reading is open to question.
          </p>
        </div>
        <Link to="/method">
          How Tether connects the dots <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="discovery-invitation">
        <div>
          <p className="discovery-eyebrow">Something on your mind?</p>
          <h2>Have a story in mind?</h2>
        </div>
        <button
          className="discovery-primary"
          onClick={() => {
            setBring(true);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          Bring a link or an idea <Plus size={18} />
        </button>
      </section>
    </div>
  );
}
export function MethodPage() {
  const examples = usePublicReading();
  const coverage = useResearchCoverage();
  const walkthroughs = examples.data?.filter(item => item.comparison.inputMode === "walkthrough") || [];
  return (
    <article className="page-wrap living-narrow living-comparison">
      <Link className="text-link" to="/explore">
        ← Back to the stories
      </Link>
      <header className="living-intro">
        <p className="eyebrow">The method</p>
        <h1>
          Look widely.
          <br />
          <em>Compare carefully.</em>
        </h1>
        <p className="living-deck">
          A useful parallel has to survive its differences. A small collection
          should never be mistaken for the whole historical record.
        </p>
      </header>
      <section className="living-section"><h2>A recurring cast, with room to disagree.</h2><p>The same figures, dynamics and stages appear across readings. Each term has a simple definition and an explicit origin.</p><Link className="text-link" to="/patterns">Learn the narrative model →</Link></section>
      <section className="living-section" id="coverage"><h2>What has actually been searched?</h2>
        {coverage.isLoading ? <p>Loading research coverage…</p> : coverage.error ? <p>Coverage is unavailable right now. <button onClick={()=>void coverage.refetch()}>Try again</button></p> : coverage.data && <>
          <p>{coverage.data.progress.publishedComparisons} published comparisons across {coverage.data.progress.reportingStories} reporting stories. {coverage.data.progress.awaitingCurrentMethod} stories still await the current method, and {coverage.data.progress.queuedInvestigations} investigations are queued. Older data is retained while new versions are researched.</p>
          <p>The cross-era historical library contains {coverage.data.canon.cases} encoded cases{coverage.data.canon.oldestYear!==null&&coverage.data.canon.newestYear!==null?`, from ${Math.abs(coverage.data.canon.oldestYear)} ${coverage.data.canon.oldestYear<0?"BCE":"CE"} to ${coverage.data.canon.newestYear}`:""}. These cases end at least 25 years before today. They are a starting point alongside wider retrieval; recent context and personal backstory are not counted as historical parallels. {coverage.data.canon.process}.</p>
          {coverage.data.grid && <CoverageGrid coverage={coverage.data.grid}/>}
          <details className="pair-detail"><summary>Technical checks and what votes tell us <Plus size={18}/></summary><p>{coverage.data.benchmark.passed} of {coverage.data.benchmark.checks} synthetic structural checks passed. These test known structures, altered vocabulary, chronology and announced-versus-completed actions. They do not measure factual accuracy or historical recall.</p><p>Upvotes and downvotes tell us whether a parallel helped. They do not turn popularity into proof. No independently measured historical-accuracy percentage is available.</p></details>
        </>}
      </section>
      {Boolean(walkthroughs.length) && (
        <section className="method-example">
          <p className="discovery-eyebrow">
            See it in practice · known historical outcomes
          </p>
          {walkthroughs.slice(0, 1).map((item) => (
            <Link
              className="text-link"
              key={item.comparison.id}
              to={`/comparisons/${item.comparison.id}`}
            >
              {item.comparison.title}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </section>
      )}
      {[
        [
          "Start with what is actually reported",
          "The stream brings in dated reporting across categories. A headline is a starting point, not a complete account. The original source and evidence cutoff stay with every assessment.",
        ],
        [
          "Describe the event before searching",
          "New investigations distinguish an event, an ongoing process and an account such as satire or commentary. The current sources establish facts, claims, roles, power relationships and a possible stage before history is introduced. A joke remains a joke; a projected result remains a projection. Thin reporting can leave the comparison open.",
        ],
        [
          "Check the collection, then search beyond it",
          "New investigations compare the current event’s actors, constraints and responses with up to 80 distinct source-encoded historical episodes. Roles, dynamics and stage help organise that search; they do not establish a match. Wider web research seeks additional eras, regions and outcomes. Search hits must be read, encoded and checked before publication. Recorded queries and source access show the actual reach; no bounded search covers all history.",
        ],
        [
          "Test the relationships",
          "A contextual reading needs distinct principal actors in a separate episode at least 25 years earlier, with an identified causal driver and leverage. It needs two corresponding actors under a specific shared constraint and response, at least two sourced correspondences on each side, a consequential difference, a credible competing reading and a clear benefit beyond the ordinary explanation. It identifies a shared mechanism, framing or power relationship. Complete action-sequence comparisons use additional order and actor-mapping checks. A separate automated claim check can withhold either kind of reading; it is not independent historian review.",
        ],
        [
          "Keep coverage separate from confidence",
          "A limited or failed search means that research is incomplete. It does not mean no parallel exists. Even a good candidate is not a guarantee that the globally closest precedent has been found. You can request a broader search from an assessment.",
        ],
        [
          "See the stories before the interpretation",
          "A concise insight leads into the current and historical facts, their shared shape and a consequential difference. An alternative reading remains available. Any later historical chapter is kept separate from what is known today. Jung-inspired ideas are interpretive tools; resemblance does not establish a collective unconscious or hidden motive.",
        ],
        [
          "Follow what changes",
          "Indicators say what would strengthen or weaken a connection. Saved preserves the exact version; Following tracks later assessments. Your forecast journal keeps timestamped estimates and fixed resolution criteria.",
        ],
        [
          "Tell us what illuminated the story",
          "You can upvote or downvote each historical parallel and describe the pattern in your own words. Feedback belongs to that exact version, stays private to Tether and can be deleted. Usefulness is not a vote on factual truth, and responses made after reading the explanation are not a blind comprehension test.",
        ],
      ].map(([title, text], index) => (
        <section className="living-section" key={title}>
          <p className="eyebrow">0{index + 1}</p>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <section className="living-section">
        <h2>The boundaries of this version</h2>
        <p>
          Reporting sources and the searchable web have language, geographic,
          editorial and access biases. Research is bounded by available capacity
          and visible source-reading checks. Some stories will be ready to read
          before their historical investigation finishes. Source-checked
          editorial cases, automatically researched cases and reference leads
          have different review depth. Forecast advantage and broad accuracy
          still require independent evaluation.
        </p>
        <Link className="text-link" to="/collections">
          Inspect the accumulated archive <ArrowRight size={15} />
        </Link>
      </section>
    </article>
  );
}
