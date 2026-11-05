import React, { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Brand, PageHeading } from "../components/Editorial";
import { useAuth } from "../components/AuthProvider";
import {
  useCurrentUserProfileQuery,
  useSaveUserPreferencesMutation,
} from "../lib/queries";
import { useToast } from "../components/Toast";

interface OnboardingProps {
  onComplete: () => void;
}
const interests = [
  {
    id: "technology",
    title: "Technology & change",
    description:
      "New tools, new gatekeepers, and the moments when the ground shifts.",
    slugs: ["platform-transition", "distribution-shift"],
  },
  {
    id: "power",
    title: "Power & competition",
    description:
      "Rising challengers, established powers, and the contest for influence.",
    slugs: ["strategic-competition", "leadership-change"],
  },
  {
    id: "trust",
    title: "Trust & institutions",
    description:
      "How systems gain authority, lose legitimacy, and face a reckoning.",
    slugs: ["legitimacy-crisis", "regulatory-crackdown"],
  },
  {
    id: "work",
    title: "Work & economies",
    description:
      "Scarce resources, changing bargains, and the people who push back.",
    slugs: ["labor-dispute", "resource-shock"],
  },
  {
    id: "culture",
    title: "Culture & ideas",
    description:
      "Old ideas returning, new movements forming, and tastes changing.",
    slugs: ["cultural-revival", "consumer-trend-swing"],
  },
  {
    id: "cycles",
    title: "Rise & fall",
    description:
      "The long arc of dominant institutions, dynasties, and public reputations.",
    slugs: ["dynastic-rise-or-decline", "scandal-cycle"],
  },
];
export function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const profile = useCurrentUserProfileQuery(user?.id);
  const save = useSaveUserPreferencesMutation(user?.id);
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (profile.data && !touched)
      setSelected(
        new Set(
          interests
            .filter((item) =>
              item.slugs.some((slug) =>
                profile.data.preferences.event_archetype_slugs.includes(slug),
              ),
            )
            .map((item) => item.id),
        ),
      );
  }, [profile.data, touched]);
  const complete = async () => {
    setError("");
    const eventArchetypeSlugs = interests
      .filter((item) => selected.has(item.id))
      .flatMap((item) => item.slugs);
    try {
      await save.mutateAsync({ eventArchetypeSlugs });
      showToast("Your reading preferences are saved.");
      onComplete();
    } catch {
      setError(
        "Your preferences couldn’t be saved. Try again, or skip for now.",
      );
    }
  };
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand home />
        <p className="eyebrow">Make it yours · Optional</p>
      </header>
      <main className="preference-wrap">
        <PageHeading
          eyebrow="A few starting points"
          title={
            <>
              Where does your
              <br />
              <em>curiosity take you?</em>
            </>
          }
          description="Choose the patterns you’d like to follow. Pick as many as you like; you can change these later in your account."
        />
        <div className="preference-grid">
          {interests.map((item) => {
            const active = selected.has(item.id);
            return (
              <button
                className="preference-option"
                key={item.id}
                aria-pressed={active}
                onClick={() => {
                  setTouched(true);
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
              >
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
                <span className="preference-check" aria-hidden="true">
                  {active && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>
        {profile.isError && (
          <div className="notice error" role="alert" style={{ marginTop: 20 }}>
            <div>
              We couldn’t load your existing preferences. Try again before
              replacing them.
              <button
                className="text-link"
                onClick={() => void profile.refetch()}
              >
                Reload preferences
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert" style={{ marginTop: 20 }}>
            {error}
          </div>
        )}
        <div className="preference-actions">
          <p>
            {selected.size
              ? `${selected.size} ${selected.size === 1 ? "interest" : "interests"} selected`
              : "A wide-open mind is a good starting point."}
          </p>
          <div>
            <button
              className="text-link"
              disabled={save.isPending}
              onClick={onComplete}
            >
              Skip for now
            </button>
            <button
              className="button-primary"
              onClick={() => void complete()}
              disabled={save.isPending || profile.isLoading || profile.isError}
            >
              {save.isPending ? "Saving…" : "Save & start reading"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
