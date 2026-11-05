import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import {
  useCurrentUserProfileQuery,
  useSaveUserPreferencesMutation,
} from "../lib/queries";
import { topicLabels, topicNames } from "../lib/comparison";
export function ReadingPreferences() {
  const { user } = useAuth();
  const profile = useCurrentUserProfileQuery(user?.id);
  const save = useSaveUserPreferencesMutation(user?.id);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (profile.data && !touched)
      setSelected(profile.data.preferences.preferred_domains);
  }, [profile.data, touched]);
  return (
    <div className="page-wrap living-narrow">
      <header className="living-intro">
        <p className="eyebrow">Your reading desk</p>
        <h1>
          Keep your interests
          <br />
          <em>within reach.</em>
        </h1>
        <p className="living-deck">
          Choose the categories that appear first in your browsing shortcuts.
          You can still read every category. Your choices do not change what a
          comparison says the evidence supports.
        </p>
      </header>
      {profile.error ? (
        <p role="alert">
          Preferences could not be loaded.{" "}
          <button className="text-link" onClick={() => void profile.refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(
              {
                eventArchetypeSlugs:
                  profile.data?.preferences.event_archetype_slugs || [],
                preferredDomains: selected,
                analysisDepth:
                  profile.data?.preferences.analysis_depth || "balanced",
              },
              { onSuccess: () => navigate("/explore") },
            );
          }}
        >
          <div className="topic-list">
            {topicNames
              .filter((topic) => topic !== "general")
              .map((topic) => (
                <button
                  key={topic}
                  type="button"
                  aria-pressed={selected.includes(topic)}
                  onClick={() => {
                    setTouched(true);
                    setSelected((current) =>
                      current.includes(topic)
                        ? current.filter((item) => item !== topic)
                        : [...current, topic],
                    );
                  }}
                >
                  {selected.includes(topic) && <Check size={15} />}{" "}
                  {topicLabels[topic]}
                </button>
              ))}
          </div>
          <div className="living-ask-bottom">
            <Link className="text-link" to="/explore">
              Back to browsing
            </Link>
            <button
              className="button-primary"
              disabled={save.isPending || profile.isLoading}
            >
              Save reading preferences
            </button>
          </div>
          {save.error && <p role="alert">{save.error.message}</p>}
        </form>
      )}
    </div>
  );
}
