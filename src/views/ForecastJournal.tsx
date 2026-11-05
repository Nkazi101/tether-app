import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { brierScore, type Forecast } from "../lib/comparison";
import { comparisonRequest, useForecasts } from "../lib/comparison-client";
import { LoadingState } from "../components/Editorial";

function ForecastEntry({
  forecast,
  changed,
}: {
  forecast: Forecast;
  changed: () => void;
}) {
  const [probability, setProbability] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState("1");
  const [note, setNote] = useState("");
  const closed = Date.parse(forecast.closesAt) <= Date.now();
  const revise = useMutation({
    mutationFn: () =>
      comparisonRequest(`/forecasts/${forecast.id}/revisions`, {
        method: "POST",
        body: JSON.stringify({
          probability: Number(probability) / 100,
          rationale: reason,
        }),
      }),
    onSuccess: changed,
  });
  const resolve = useMutation({
    mutationFn: () =>
      comparisonRequest(`/forecasts/${forecast.id}/resolution`, {
        method: "POST",
        body: JSON.stringify({ outcome: Number(outcome), note }),
      }),
    onSuccess: changed,
  });
  const first = forecast.revisions[0];
  const latest = forecast.revisions.at(-1);
  return (
    <article className="living-forecast">
      <h3>{forecast.question}</h3>
      <p>{forecast.criteria}</p>
      <p className="living-meta">
        Closes {new Date(forecast.closesAt).toLocaleString()} ·{" "}
        {forecast.outcome === null
          ? closed
            ? "Awaiting resolution"
            : "Open"
          : forecast.outcome === 1
            ? "Resolved: occurred"
            : "Resolved: did not occur"}
      </p>
      <a href={forecast.resolutionSource} target="_blank" rel="noreferrer">
        Resolution source ↗
      </a>
      {latest && (
        <p>
          Your latest estimate:{" "}
          <strong>{Math.round(latest.probability * 100)}%</strong>
        </p>
      )}
      <details>
        <summary>Every estimate and its reason</summary>
        <ol>
          {forecast.revisions.map((revision) => (
            <li key={revision.id}>
              <p>
                {new Date(revision.createdAt).toLocaleString()} ·{" "}
                {Math.round(revision.probability * 100)}%
              </p>
              <p>{revision.rationale}</p>
            </li>
          ))}
        </ol>
      </details>
      {forecast.outcome !== null && first && latest && (
        <div className="notice">
          <p>
            Initial Brier score:{" "}
            {brierScore(first.probability, forecast.outcome).toFixed(3)}.
            Latest:{" "}
            {brierScore(latest.probability, forecast.outcome).toFixed(3)}. Lower
            is better. A single question does not establish forecasting skill.
          </p>
        </div>
      )}
      {forecast.resolutionNote && (
        <p>Resolution evidence: {forecast.resolutionNote}</p>
      )}
      {!closed && forecast.outcome === null && (
        <details>
          <summary>Revise your estimate</summary>
          <form
            className="living-observation"
            onSubmit={(event) => {
              event.preventDefault();
              revise.mutate();
            }}
          >
            <label>
              Probability, 0–100%
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(event) => setProbability(event.target.value)}
                required
              />
            </label>
            <label>
              What changed your estimate?
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <button className="button-secondary" disabled={revise.isPending}>
              Record a new estimate
            </button>
            {revise.error && <p role="alert">{revise.error.message}</p>}
          </form>
        </details>
      )}
      {closed && forecast.outcome === null && (
        <details>
          <summary>Resolve against the written criteria</summary>
          <form
            className="living-observation"
            onSubmit={(event) => {
              event.preventDefault();
              resolve.mutate();
            }}
          >
            <label>
              Outcome
              <select
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
              >
                <option value="1">The event occurred</option>
                <option value="0">The event did not occur</option>
              </select>
            </label>
            <label>
              Explain the evidence from the resolution source
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                minLength={30}
                maxLength={3000}
                required
              />
            </label>
            <p>
              Resolve only when the written criteria establish an answer. Leave
              ambiguous questions unresolved.
            </p>
            <button className="button-secondary" disabled={resolve.isPending}>
              Record the resolution
            </button>
            {resolve.error && <p role="alert">{resolve.error.message}</p>}
          </form>
        </details>
      )}
    </article>
  );
}
export function ForecastJournal({ situationId }: { situationId: string }) {
  const forecasts = useForecasts(situationId, true);
  const client = useQueryClient();
  const [question, setQuestion] = useState("");
  const [criteria, setCriteria] = useState("");
  const [resolutionSource, setSource] = useState("");
  const [closesAt, setCloses] = useState("");
  const [probability, setProbability] = useState("");
  const [rationale, setRationale] = useState("");
  const changed = () => {
    void client.invalidateQueries({ queryKey: ["forecasts"] });
  };
  const create = useMutation({
    mutationFn: () =>
      comparisonRequest(`/situations/${situationId}/forecasts`, {
        method: "POST",
        body: JSON.stringify({
          question,
          criteria,
          resolutionSource,
          closesAt: new Date(closesAt).toISOString(),
          probability: Number(probability) / 100,
          rationale,
        }),
      }),
    onSuccess: () => {
      changed();
      setQuestion("");
      setCriteria("");
      setProbability("");
      setRationale("");
    },
  });
  return (
    <div className="living-journal">
      <h2>Your private forecast journal</h2>
      <p>
        Record a specific prediction and keep every revision. These are your
        estimates; Tether does not assign a calibrated probability to this
        comparison.
      </p>
      {forecasts.isLoading ? (
        <LoadingState label="Opening your journal…" />
      ) : forecasts.error ? (
        <p role="alert">{forecasts.error.message}</p>
      ) : (
        forecasts.data?.map((forecast) => (
          <ForecastEntry
            forecast={forecast}
            key={forecast.id}
            changed={changed}
          />
        ))
      )}
      <details className="living-details">
        <summary>Record a prediction</summary>
        <form
          className="living-observation"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <label>
            What specific event will occur?
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              minLength={15}
              maxLength={500}
              placeholder="Will a named party take a defined action before a particular date?"
              required
            />
          </label>
          <label>
            Exactly what counts as occurring?
            <textarea
              value={criteria}
              onChange={(event) => setCriteria(event.target.value)}
              minLength={30}
              maxLength={3000}
              placeholder="Define the action, deadline, source and any important exceptions."
              required
            />
          </label>
          <label>
            Source to use when resolving
            <input
              type="url"
              value={resolutionSource}
              onChange={(event) => setSource(event.target.value)}
              required
            />
          </label>
          <label>
            Closing date and time (your local time)
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setCloses(event.target.value)}
              required
            />
          </label>
          <label>
            Your probability, 0–100%
            <input
              type="number"
              min="0"
              max="100"
              value={probability}
              onChange={(event) => setProbability(event.target.value)}
              required
            />
          </label>
          <label>
            Why this estimate?
            <textarea
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              minLength={10}
              maxLength={2000}
              required
            />
          </label>
          <p className="living-subtle">
            The question and criteria are fixed when recorded. Estimates can be
            revised until closing, with earlier estimates preserved.
          </p>
          <button className="button-primary" disabled={create.isPending}>
            Record prediction
          </button>
          {create.error && <p role="alert">{create.error.message}</p>}
        </form>
      </details>
    </div>
  );
}
