import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  EditorialImage,
  PageHeading,
  LoadingState,
  EmptyState,
  TetherMark,
} from "../components/Editorial";
import { useCollectionsQuery } from "../lib/queries";
import { appRoutes } from "../lib/routes";

export function Collections() {
  const query = useCollectionsQuery();
  const [filter, setFilter] = useState("All");
  const volumesRef = useRef<HTMLDivElement>(null);
  const data = query.data;
  const volumes = useMemo(
    () =>
      data?.volumes.filter(
        (volume) =>
          filter === "All" ||
          volume.title.toLowerCase().includes(filter.toLowerCase()) ||
          volume.events.some(
            (event) => event.tag.toLowerCase() === filter.toLowerCase(),
          ),
      ) || [],
    [data, filter],
  );
  const explorePath = (title: string) =>
    `${appRoutes.explore}?q=${encodeURIComponent(title)}`;
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="The collections"
        title={
          <>
            Ideas worth
            <br />
            <em>spending time with.</em>
          </>
        }
        description="Thematic reading through the archive. Follow an idea across eras, events, and different ways of seeing."
      />
      {query.isLoading ? (
        <LoadingState label="Taking the volumes off the shelf…" />
      ) : query.isError || !data ? (
        <EmptyState
          title="The collections are unavailable for a moment."
          description="Try again, or explore the archive with a question of your own."
          action="Try again"
          onAction={() => void query.refetch()}
        />
      ) : (
        <>
          <section className="collection-feature">
            <div className="collection-feature-copy">
              <p className="eyebrow">From the reading desk</p>
              <h2>{data.volumes[0]?.title || data.featured.title}</h2>
              <p>{data.volumes[0]?.description || data.featured.description}</p>
              <button
                className="text-link"
                onClick={() =>
                  volumesRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                Browse the collection <ArrowRight size={16} />
              </button>
            </div>
            <figure>
              <EditorialImage
                src="/images/reading-room.jpg"
                alt="Books arranged on the shelves of a library"
                eager
              />
              <figcaption className="collection-photo-credit">
                A world of ideas, waiting to connect. · Photo via Unsplash
              </figcaption>
            </figure>
          </section>
          <section
            className="collection-filters"
            aria-label="Collection topics"
          >
            <div className="topic-list">
              {Array.from(new Set(["All", ...data.filters])).map((value) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
          <div ref={volumesRef}>
            {volumes.map((volume, index) => (
              <section className="collection-volume" key={volume.title}>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      Volume {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2>{volume.title}</h2>
                    <p>{volume.description}</p>
                  </div>
                  <span>{volume.events.length} archive entries</span>
                </div>
                <div className="volume-grid">
                  {volume.events.map((item, i) => (
                    <Link
                      key={`${item.title}-${i}`}
                      className="volume-story"
                      to={explorePath(item.title)}
                    >
                      <div className="archive-entry-era">
                        <span>{item.tag.replaceAll("-", "–")}</span>
                        <TetherMark />
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className="text-link">
                        Explore the historical context{" "}
                        <ArrowUpRight size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            {volumes.length === 0 && (
              <EmptyState
                title="This shelf is still growing."
                description="There are no volumes for this topic yet. Explore the rest of the collection."
                action="Show all collections"
                onAction={() => setFilter("All")}
              />
            )}
          </div>
          <section className="collection-endnote">
            <div>
              <h2>A question of your own?</h2>
              <p>
                The archive is a starting point. Follow the connection that
                interests you.
              </p>
            </div>
            <Link className="button-secondary" to={appRoutes.explore}>
              Explore the archive <ArrowRight size={16} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
