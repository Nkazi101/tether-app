import React from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowUpRight } from "lucide-react";
import { useToast } from "../components/Toast";
import { useAuth } from "../components/AuthProvider";
import { PageHeading, LoadingState, EmptyState } from "../components/Editorial";
import { useCurationsQuery, useDeleteCurationMutation } from "../lib/queries";
import { appRoutes } from "../lib/routes";

interface CurationsProps {
  onSelectParallel?: (modern: string, historical: string) => void;
}
export function Curations({ onSelectParallel }: CurationsProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const query = useCurationsQuery(user?.id);
  const remove = useDeleteCurationMutation(user?.id);
  const curations = query.data || [];
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Your personal reading desk"
        title={
          <>
            Keep the <em>thread.</em>
          </>
        }
        description="The connections you found worth keeping. Come back with fresh eyes as the story unfolds."
      >
        <Link className="text-link" to={appRoutes.feed}>
          Find another perspective <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      {query.isLoading ? (
        <LoadingState label="Opening your saved parallels…" />
      ) : query.isError ? (
        <EmptyState
          title="Your reading desk is unavailable for a moment."
          description="Your saved connections haven’t been changed. Try loading them again."
          action="Try again"
          onAction={() => void query.refetch()}
        />
      ) : curations.length === 0 ? (
        <EmptyState
          title="Some ideas are worth returning to."
          description="Use the bookmark beside any comparison to keep it here. Start with today’s perspectives, or follow a question into the archive."
          action="Find your first connection"
          href={appRoutes.feed}
        />
      ) : (
        <div className="saved-list">
          {curations.map((item, index) => (
            <article className="saved-item" key={item.id}>
              <span className="saved-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <button
                className="saved-story"
                onClick={() =>
                  onSelectParallel?.(item.modernEvent, item.historicalEvent)
                }
              >
                <h2>{item.modernTitle}</h2>
                <p>Through the lens of {item.historicalTitle}</p>
                <p>{item.description}</p>
                <span className="text-link">
                  Return to the comparison <ArrowUpRight size={14} />
                </span>
              </button>
              <button
                className="icon-button"
                disabled={remove.isPending}
                aria-label={`Remove ${item.modernTitle} from saved parallels`}
                onClick={async () => {
                  try {
                    await remove.mutateAsync(item.id);
                    showToast("Removed from your reading desk.");
                  } catch {
                    showToast(
                      "Could not remove this parallel. Please try again.",
                    );
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
